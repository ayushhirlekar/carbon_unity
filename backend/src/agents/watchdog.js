const { supabaseAdmin } = require('../config/supabase');
const { assess } = require('../reasoning/assess');
const tools = require('./tools');
const devices = require('../services/deviceService');

/**
 * The Watchdog.
 *
 * The only part of this system that contacts a farmer unprompted.
 * Everything else answers a question that was asked.
 *
 * That privilege comes with a duty to be worth the interruption,
 * so every rule here has to clear three bars:
 *
 *   1. ACTIONABLE — there is something to do today or this week.
 *      "Your carbon is low" is not an alert, it is a fact.
 *   2. SPECIFIC to this plot — derived from its own readings, not
 *      a seasonal calendar everyone receives.
 *   3. DEDUPED — one message per condition per day. Telling
 *      someone their feed is offline once is help; telling them
 *      every six hours is why people mute notifications.
 *
 * Alerts carry no invented numbers: every figure comes from the
 * same tools the agents use.
 */

const MOISTURE_URGENT = 10;   // % volumetric — crop stress in a rainfed system
const DRY_SPELL_MM = 5;       // forecast rain over a week below this is a dry run
const STALE_DAYS = 3;

/**
 * Dry-spell trigger, PLACEHOLDER VALUES.
 *
 * These are plausible for a rainfed semi-arid black soil and they
 * are not sourced from anything. The real numbers belong to the
 * reasoning engine, conditioned on crop, soil texture and growth
 * stage — `suitability_thresholds` already holds that kind of
 * value and this rule should read from it once the mapping from
 * crop stage to trigger exists.
 *
 * Left explicit and named rather than inlined, so that the day
 * someone asks "where does 22 come from?" the answer is visible
 * instead of buried in a condition.
 */
const DRY_MOISTURE_LOW = 22;      // % — below comfortable for a growing crop
const DRY_FALL_PER_DAY = -1.0;    // %/day — a decline, not noise
const DRY_RAIN_RELIEF_MM = 5;     // mm forecast that would fix it unaided
const WET_MOISTURE_CLEARED = 25;  // % — at which a dry-spell alert is over

/**
 * Lifecycle per rule.
 *
 * 'daily' rules may legitimately recur each day while they are
 * true: an unanswered nudge is still worth making tomorrow.
 *
 * 'open' rules describe a CONDITION with a beginning and an end —
 * a probe that is offline, a field that is drying out. These are
 * raised once, held open, and resolved when the condition clears.
 * Repeating them every morning is how notifications get muted.
 */
const LIFECYCLE = {
  moisture_critical: 'open',
  dry_spell: 'open',
  sensor_stuck: 'open',
  sensor_offline: 'open',
};
const lifecycleOf = (kind) => LIFECYCLE[kind] || 'daily';

/** Rules producing zero or more alerts for one parcel. */
const RULES = [
  {
    kind: 'moisture_critical',
    severity: 'urgent',
    run: async ({ sensing, weather }) => {
      const m = sensing.latest?.moisture_percent?.value_num;
      if (m === undefined || m === null || Number(m) >= MOISTURE_URGENT) return null;
      const rain = weather?.rainNext7dMm;
      return {
        title: 'Soil is very dry',
        body: `Soil moisture is ${m}%.` +
          (rain !== undefined && rain < DRY_SPELL_MM
            ? ` Only ${rain} mm of rain is expected in the next week, so it will not recover on its own.`
            : ''),
        evidence: { moisture_percent: Number(m), threshold: MOISTURE_URGENT, rain_next_7d_mm: rain ?? null },
      };
    },
    // Required, because this rule is lifecycle 'open'. Without a
    // clears() an open alert is raised once and stands forever:
    // it can never resolve, and because it is still standing it
    // can never fire again either. Any rule added to LIFECYCLE
    // needs one of these.
    clears: ({ sensing }) => {
      const m = sensing?.latest?.moisture_percent?.value_num;
      return m !== undefined && m !== null && Number(m) >= MOISTURE_URGENT;
    },
  },
  {
    kind: 'dry_spell_ahead',
    severity: 'advice',
    run: async ({ weather, sensing }) => {
      if (!weather || weather.error) return null;
      if (weather.rainNext7dMm >= DRY_SPELL_MM) return null;
      const m = sensing.latest?.moisture_percent?.value_num;
      // Only worth saying if moisture is not already comfortable —
      // a dry week on a wet field is not news.
      if (m !== undefined && m !== null && Number(m) > 20) return null;
      return {
        title: 'Little rain expected',
        body: `${weather.rainNext7dMm} mm of rain forecast over the next week, and it has been ` +
              `${weather.daysSinceRain} days since the last rain. Plan water for the crop.`,
      };
    },
  },
  {
    kind: 'feed_stale',
    severity: 'info',
    run: async ({ sensing }) => {
      if (!sensing.stale || sensing.ageDays === null) return null;
      if (sensing.ageDays < STALE_DAYS) return null;
      return {
        title: 'Field readings are old',
        body: `The last reading for this plot is ${sensing.ageDays} days old, so advice may not ` +
              `reflect today's conditions.`,
      };
    },
  },
  {
    kind: 'needs_baseline',
    severity: 'advice',
    run: async ({ crediting }) => {
      if (crediting.status !== 'awaiting_baseline') return null;
      return {
        title: 'One more soil reading needed',
        body: 'Carbon credits are paid on change. You have one reading; a second Soil Health Card ' +
              'from a later date is what turns it into a measurable gain.',
      };
    },
  },
  {
    kind: 'no_soil_data',
    severity: 'advice',
    run: async ({ crediting }) => {
      if (crediting.status !== 'no_samples') return null;
      return {
        title: 'Add your Soil Health Card',
        body: 'This plot has no soil readings yet. Copying the values from the card you already ' +
              'hold gives it a starting point at no cost.',
      };
    },
  },
  {
    kind: 'credit_ready',
    severity: 'advice',
    run: async ({ crediting }) => {
      if (crediting.status !== 'gaining' || !crediting.creditableTco2e) return null;
      return {
        title: 'Your soil carbon has gone up',
        body: `Carbon rose from ${crediting.baselineSoc}% to ${crediting.currentSoc}%, about ` +
              `${crediting.creditableTco2e} tCO2e across ${crediting.areaHa} ha. Join a project ` +
              `to have it verified.`,
      };
    },
  },
  // ----------------------------------------------------------
  // Device-driven rules.
  //
  // These read the trend and health that deviceService computes,
  // never raw rows: the arithmetic lives in one place so an alert
  // and an agent answer about the same field cannot disagree.
  // ----------------------------------------------------------
  {
    kind: 'dry_spell',
    severity: 'urgent',
    message_key: 'alert.irrigate_soon',
    run: async ({ trend, weather }) => {
      const m = trend?.moisture_percent;
      if (!m || !m.available || m.points < 3) return null;

      // Three conditions, all required. Low alone is a dry season.
      // Falling alone is a field drying normally after rain. Low
      // AND falling AND no rain coming is a problem the farmer can
      // still do something about, which is the only kind worth
      // interrupting them for.
      if (m.latest.value >= DRY_MOISTURE_LOW) return null;
      if (m.slopePerDay > DRY_FALL_PER_DAY) return null;

      const rain = weather && !weather.error ? weather.rainNext7dMm : null;
      if (rain !== null && rain >= DRY_RAIN_RELIEF_MM) return null;

      return {
        title: 'Your field is drying out',
        body: `Soil moisture is ${m.latest.value}% and has fallen ${Math.abs(m.change)}% over ` +
              `${m.spanDays} days.` +
              (rain !== null
                ? ` Only ${rain} mm of rain is forecast this week, so it will not recover on its own.`
                : '') +
              ' Water the crop if you can.',
        evidence: {
          moisture_now: m.latest.value,
          moisture_change: m.change,
          slope_per_day: m.slopePerDay,
          span_days: m.spanDays,
          rain_next_7d_mm: rain,
          readings_used: m.points,
          simulated: m.simulated,
        },
      };
    },
    // The condition is over once the soil is comfortable again —
    // which is what makes the rain_event demo work: the alert
    // clears rather than sitting there contradicting the field.
    clears: ({ trend }) => {
      const m = trend?.moisture_percent;
      return Boolean(m?.available && m.latest.value >= WET_MOISTURE_CLEARED);
    },
  },
  {
    kind: 'sensor_stuck',
    severity: 'advice',
    message_key: 'alert.sensor_stuck',
    run: async ({ health }) => {
      const stuck = (health?.devices || []).filter((d) => d.stuck);
      if (!stuck.length) return null;

      // The quiet failure. An offline probe is obvious; one
      // reporting an identical value forever looks like a stable
      // field, and a stable field reads as good news. Every piece
      // of advice downstream then rests on a number that stopped
      // being a measurement some time ago.
      const d = stuck[0];
      return {
        title: 'A sensor may be stuck',
        body: `${d.label || d.device_id} has reported almost the same reading ` +
              `${d.readingsConsidered} times in a row. That usually means the probe has failed ` +
              'rather than that the soil is perfectly steady. Check it before trusting the advice.',
        evidence: {
          device_id: d.device_id,
          readings_considered: d.readingsConsidered,
          variation: d.variation,
          threshold: devices.STUCK_VARIATION,
        },
      };
    },
    clears: ({ health }) => !(health?.anyStuck),
  },
  {
    kind: 'sensor_offline',
    severity: 'advice',
    message_key: 'alert.sensor_offline',
    run: async ({ health }) => {
      const offline = (health?.devices || []).filter((d) => d.offline && d.is_active);
      if (!offline.length) return null;

      const d = offline[0];
      return {
        title: 'A sensor has stopped reporting',
        body: `${d.label || d.device_id} last reported ` +
              (d.ageHours === null ? 'never' : `${d.ageHours} hours ago`) +
              '. Until it is back, advice for this plot rests on older readings.',
        evidence: {
          device_id: d.device_id,
          last_seen: d.last_seen,
          age_hours: d.ageHours,
          threshold_hours: devices.OFFLINE_HOURS,
        },
      };
    },
    clears: ({ health }) => !(health?.anyOffline),
  },
  {
    kind: 'limiting_factor',
    severity: 'advice',
    run: async ({ assessment }) => {
      if (!assessment || assessment.status !== 'ok' || !assessment.limitingFactor) return null;
      const first = (assessment.sequence || []).find((s) => s.stage === 1);
      if (!first) return null;
      // Only raise this when the constraint is genuinely binding.
      if (assessment.limitingFactor.score > 0.35) return null;
      return {
        title: `Start with: ${first.name}`,
        body: `${assessment.limitingFactor.variable.replace(/_/g, ' ')} is holding this plot back ` +
              `at ${assessment.limitingFactor.value}${assessment.limitingFactor.unit || ''}. ` +
              `${first.rationale}`,
      };
    },
  },
];

/**
 * An 'open' rule without clears() is a permanent alert: it cannot
 * resolve, and because it is still standing it cannot fire again
 * either. That is silent and indistinguishable from a quiet field,
 * so it fails loudly at load instead.
 */
for (const kind of Object.keys(LIFECYCLE)) {
  if (LIFECYCLE[kind] !== 'open') continue;
  const rule = RULES.find((r) => r.kind === kind);
  if (!rule) throw new Error(`watchdog: LIFECYCLE names unknown rule "${kind}"`);
  if (typeof rule.clears !== 'function') {
    throw new Error(`watchdog: rule "${kind}" is lifecycle 'open' but has no clears()`);
  }
}

/** Evaluate every rule for one parcel and store what fires. */
const checkParcel = async (farm) => {
  const [sensing, weather, crediting, health] = await Promise.all([
    tools.sensingTool(farm.farm_id),
    tools.weatherTool(farm.farm_id).catch(() => ({ error: 'unavailable' })),
    tools.creditingTool(farm.farm_id),
    devices.getDeviceHealth(farm.farm_id).catch(() => ({ devices: [] })),
  ]);

  // Device health has to be known BEFORE the trend is read, because
  // it decides which sources the trend may use. The weather feed
  // and a probe both write moisture_percent, so taking whichever
  // reported last would let a gridded estimate outrank a direct
  // measurement of this field purely by running more often.
  const sources = devices.preferredSources(health);
  const moistureTrend = await devices
    .getTrend(farm.farm_id, 'moisture_percent', 24 * 14, { sources })
    .catch(() => null);

  let assessment = null;
  try {
    assessment = await assess(farm.farm_id);
  } catch {
    assessment = null;
  }

  const context = {
    farm,
    sensing,
    weather,
    crediting,
    assessment,
    health,
    trend: { moisture_percent: moistureTrend },
  };

  const raised = [];
  const resolved = [];
  // Severity and wording alongside the bare kinds. Callers that
  // only wanted the names keep working; anything showing an alert
  // to a person needs to know whether it is urgent, and deriving
  // that from a string in the UI would put the rule's severity in
  // two places.
  const raisedDetail = [];
  const resolvedDetail = [];

  // Open alerts currently standing for this parcel, so a rule can
  // be asked whether its condition has ended without each rule
  // having to query for itself.
  const { data: openRows } = await supabaseAdmin
    .from('alerts')
    .select('alert_id, kind, dedupe_key')
    .eq('farm_id', farm.farm_id)
    .eq('lifecycle', 'open')
    .is('resolved_at', null);

  const openByKind = new Map((openRows || []).map((r) => [r.kind, r]));

  for (const rule of RULES) {
    let out;
    try {
      out = await rule.run(context);
    } catch {
      continue;   // a broken rule must not stop the rest
    }

    const lifecycle = lifecycleOf(rule.kind);
    const standing = openByKind.get(rule.kind);

    // Nothing fired. For an open condition that is already raised,
    // decide whether it has genuinely cleared.
    //
    // A rule falling silent is NOT the same as its condition
    // ending: a dry-spell rule goes quiet the moment the trend has
    // too few readings to judge, and closing the alert then would
    // tell the farmer their field had recovered on the strength of
    // missing data. So resolution requires an explicit `clears`
    // that says yes.
    if (!out) {
      if (lifecycle === 'open' && standing && typeof rule.clears === 'function') {
        let cleared = false;
        try {
          cleared = rule.clears(context);
        } catch {
          cleared = false;
        }
        if (cleared) {
          await supabaseAdmin
            .from('alerts')
            .update({ resolved_at: new Date().toISOString() })
            .eq('alert_id', standing.alert_id);
          resolved.push(rule.kind);
          resolvedDetail.push({ kind: rule.kind, severity: rule.severity });
        }
      }
      continue;
    }

    // Already standing and still true: say nothing. The alert is
    // on the farmer's screen and repeating it adds no information.
    if (lifecycle === 'open' && standing) continue;

    const row = {
      farm_id: farm.farm_id,
      wallet_address: farm.farmer_wallet,
      kind: rule.kind,
      severity: rule.severity,
      title: out.title,
      body: out.body,
      dedupe_key: rule.kind,
      lifecycle,
      // Kept alongside the rendered English so the alert can be
      // re-rendered in the farmer's own language later, and so the
      // figures that triggered it are inspectable rather than only
      // readable inside a sentence.
      message_key: rule.message_key || null,
      evidence: out.evidence || null,
    };

    // For daily rules the unique index on (farm, dedupe_key, day)
    // enforces one-per-day; for open rules the partial index on
    // unresolved rows does. Either way a duplicate is expected
    // rather than an error, so a conflict is not logged as one.
    const { error } = await supabaseAdmin.from('alerts').insert([row]);
    if (!error) {
      raised.push(rule.kind);
      raisedDetail.push({
        kind: rule.kind,
        severity: rule.severity,
        title: out.title,
        body: out.body,
        evidence: out.evidence || null,
      });
    }
  }

  return { farmId: farm.farm_id, raised, resolved, raisedDetail, resolvedDetail };
};

/** Every parcel that has an owner to notify. */
const runAll = async () => {
  const { data: farms } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, farmer_wallet')
    .not('farmer_wallet', 'is', null);

  const results = [];
  for (const farm of farms || []) {
    try {
      results.push(await checkParcel(farm));
    } catch (e) {
      results.push({ farmId: farm.farm_id, error: e.message });
    }
  }
  return results;
};

module.exports = {
  runAll,
  checkParcel,
  RULES,
  LIFECYCLE,
  lifecycleOf,
  MOISTURE_URGENT,
  DRY_SPELL_MM,
  STALE_DAYS,
  DRY_MOISTURE_LOW,
  DRY_FALL_PER_DAY,
  DRY_RAIN_RELIEF_MM,
  WET_MOISTURE_CLEARED,
};
