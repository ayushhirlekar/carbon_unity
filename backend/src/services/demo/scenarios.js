/**
 * What a simulated field does.
 *
 * One definition, imported by both the CLI (scripts/simulate.js)
 * and the demo endpoint. Two copies of "what a dry spell looks
 * like" would drift within a week, and then the button in the app
 * and the script in the terminal would be demonstrating different
 * systems while appearing to demonstrate one.
 *
 * Values are plausible for a rainfed semi-arid black soil in
 * Maharashtra. They are not measurements of anywhere, and every
 * row they produce is written with source='simulated' so nothing
 * downstream can mistake them for readings from real soil.
 */

const noise = (amp) => (Math.random() - 0.5) * 2 * amp;
const round = (v) => Math.round(v * 10) / 10;

// A daily cycle, so soil temperature is not a flat line — which
// would itself look like a stuck sensor to the Watchdog.
const dailyTemp = (dayIndex, base) => base + Math.sin(dayIndex / 3) * 2.5 + noise(0.6);

/**
 * Each scenario is (t, i) => readings[], where t runs 0→1 across
 * the run and i is the day index.
 *
 * `expect` is what the scenario should cause, and it is part of
 * the definition rather than documentation: it is shown in the UI
 * next to the button and asserted by the acceptance script, so a
 * scenario that stops producing its outcome fails visibly.
 */
const SCENARIOS = {
  normal: {
    label: 'Healthy field',
    expect: 'No alerts — moisture drifts but stays comfortable',
    readings: (t, i) => [
      { variable: 'moisture_percent', value: round(28 + Math.sin(i / 4) * 3 + noise(0.8)), unit: '%' },
      { variable: 'soil_temp_c', value: round(dailyTemp(i, 24)), unit: 'C' },
      { variable: 'air_humidity_percent', value: round(62 + noise(5)), unit: '%' },
    ],
  },

  dry_spell: {
    label: 'Drying out',
    expect: 'Two urgent alerts as it worsens — a dry spell, then critically dry soil',
    // Starts comfortable and ends genuinely critical, so the run
    // crosses TWO thresholds rather than one: dry_spell when the
    // trend turns (low, falling, no rain forecast), then
    // moisture_critical below 10%. Escalation is what makes this
    // read as monitoring rather than as a single tripwire.
    readings: (t, i) => [
      { variable: 'moisture_percent', value: round(32 - t * 25 + noise(0.4)), unit: '%' },
      { variable: 'soil_temp_c', value: round(dailyTemp(i, 27 + t * 4)), unit: 'C' },
      { variable: 'air_humidity_percent', value: round(55 - t * 20 + noise(4)), unit: '%' },
    ],
  },

  rain_event: {
    label: 'Rain after drought',
    expect: 'Alert raised, then resolved when the soil recovers',
    readings: (t, i) => {
      const wet = t > 0.65;
      return [
        { variable: 'moisture_percent', value: round(wet ? 34 + noise(1.5) : 16 - t * 4 + noise(0.6)), unit: '%' },
        { variable: 'soil_temp_c', value: round(dailyTemp(i, wet ? 23 : 29)), unit: 'C' },
        { variable: 'air_humidity_percent', value: round(wet ? 85 + noise(4) : 48 + noise(5)), unit: '%' },
        ...(wet ? [{ variable: 'rainfall_mm', value: round(22 + noise(8)), unit: 'mm' }] : []),
      ];
    },
  },

  stuck: {
    label: 'Stuck probe',
    expect: 'A sensor_stuck alert — the quiet failure that looks like a stable field',
    // Not perfectly identical: a failed ADC usually jitters in the
    // last bit, and the rule's tolerance exists for exactly that.
    readings: () => [
      { variable: 'moisture_percent', value: round(19.4 + noise(0.02)), unit: '%' },
      { variable: 'soil_temp_c', value: round(25.1 + noise(0.02)), unit: 'C' },
    ],
  },

  offline: {
    label: 'Probe goes silent',
    expect: 'Sends a little, then stops — sensor_offline comes from the timer sweep',
    stopsEarly: 4,
    readings: (t, i) => [
      { variable: 'moisture_percent', value: round(26 + noise(1)), unit: '%' },
      { variable: 'soil_temp_c', value: round(dailyTemp(i, 24)), unit: 'C' },
    ],
  },

  noisy: {
    label: 'Faulty readings',
    expect: 'Impossible values rejected at ingest, and no false alert raised',
    readings: (t, i) => {
      const out = [
        { variable: 'moisture_percent', value: round(27 + noise(2)), unit: '%' },
        { variable: 'soil_temp_c', value: round(dailyTemp(i, 24)), unit: 'C' },
      ];
      if (i % 3 === 0) out.push({ variable: 'moisture_percent', value: 480, unit: '%' });
      if (i % 4 === 0) out.push({ variable: 'moisture_percent', value: -12, unit: '%' });
      if (i % 5 === 0) out.push({ variable: 'not_a_real_variable', value: 7 });
      return out;
    },
  },
};

const SCENARIO_NAMES = Object.keys(SCENARIOS);

/** What the UI lists, without exposing the generator functions. */
const catalogue = () =>
  SCENARIO_NAMES.map((name) => ({
    name,
    label: SCENARIOS[name].label,
    expect: SCENARIOS[name].expect,
  }));

/**
 * The date a given day of a run should carry.
 *
 * Always walks from `days` ago TOWARD today and never past it.
 * A cursor that outruns the wall clock writes readings dated in
 * the future, which silently poisons everything reasoning from
 * "now" — device age, staleness, days since rain. Compressing time
 * is the obvious way to produce one, so the cursor is built not to.
 */
const dateForDay = (totalDays, dayIndex) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (totalDays - 1 - dayIndex));
  return d.toISOString().slice(0, 10);
};

module.exports = { SCENARIOS, SCENARIO_NAMES, catalogue, dateForDay, round, noise };
