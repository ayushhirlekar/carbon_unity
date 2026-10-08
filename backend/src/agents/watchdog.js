const { supabaseAdmin } = require('../config/supabase');
const { assess } = require('../reasoning/assess');
const tools = require('./tools');

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
      };
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

/** Evaluate every rule for one parcel and store what fires. */
const checkParcel = async (farm) => {
  const [sensing, weather, crediting] = await Promise.all([
    tools.sensingTool(farm.farm_id),
    tools.weatherTool(farm.farm_id).catch(() => ({ error: 'unavailable' })),
    tools.creditingTool(farm.farm_id),
  ]);

  let assessment = null;
  try {
    assessment = await assess(farm.farm_id);
  } catch {
    assessment = null;
  }

  const context = { farm, sensing, weather, crediting, assessment };
  const raised = [];

  for (const rule of RULES) {
    let out;
    try {
      out = await rule.run(context);
    } catch {
      continue;   // a broken rule must not stop the rest
    }
    if (!out) continue;

    const row = {
      farm_id: farm.farm_id,
      wallet_address: farm.farmer_wallet,
      kind: rule.kind,
      severity: rule.severity,
      title: out.title,
      body: out.body,
      dedupe_key: rule.kind,
    };

    // The unique index on (farm, dedupe_key, day) is what enforces
    // one-per-day; a duplicate is expected, not an error.
    const { error } = await supabaseAdmin.from('alerts').insert([row]);
    if (!error) raised.push(rule.kind);
  }

  return { farmId: farm.farm_id, raised };
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

module.exports = { runAll, checkParcel, RULES, MOISTURE_URGENT, DRY_SPELL_MM, STALE_DAYS };
