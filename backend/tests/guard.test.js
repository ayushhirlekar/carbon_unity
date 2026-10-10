/**
 * Numeric guard — regression suite.
 *
 * Run: node tests/guard.test.js        (from backend/)
 *
 * Why a plain script and not a framework: this needs to be
 * runnable with no install step, on a machine where the only
 * certainty is that node exists. It prints PASS/FAIL per case and
 * exits non-zero on any failure, which is all CI would ask of it.
 *
 * The suite exists because the guard's guarantee was asserted for
 * weeks and verified once, inline, in a session whose output is
 * gone. A property nobody can re-check is not a property. The
 * Devanagari cases in particular encode a hole that was live in
 * production-shaped code: \d is ASCII-only, so every figure in a
 * Marathi or Hindi answer passed unchecked.
 */

const { guarded, check } = require('../src/agents/numericGuard');

const facts = {
  farm: { name: 'Demo Farm', village: 'Shirgaon', area_ha: 3.84 },
  assessment: {
    status: 'ok',
    limitingFactor: { variable: 'moisture_percent', value: 14.5, unit: '%' },
    suitability: [{ variable: 'soc_percent', value: 0.61, score: 0.35 }],
    confidence: { evidence: 0.4, data: 0.7, context: 0.8, temporal: 0.5, limitedBy: 'evidence' },
    claims: [{ claim_id: 'C03', summary: 'FYM raised soil carbon', effect_size: 0.12 }],
  },
};

let pass = 0;
const failures = [];

const record = (ok, name, detail) => {
  if (ok) { pass += 1; console.log(`PASS  ${name}`); }
  else { failures.push(name); console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ''}`); }
};

/** Assert how a piece of generated prose is treated. */
// 'passed' is a clean first attempt, 'regenerated' is a second
// attempt that satisfied the guard. Both mean the model's own prose
// reached the farmer, which is what these cases are asserting;
// only template_fallback means it was blocked.
const SERVED = new Set(['passed', 'regenerated']);

const served = async (name, text, expect, template = 'TEMPLATE') => {
  const r = await guarded(async () => text, facts, template);
  const got = SERVED.has(r.mode) ? 'served' : 'blocked';
  record(got === expect, name, `got ${got} (mode=${r.mode}), wanted ${expect}`);
};

(async () => {
  console.log('--- supported figures are served ---');
  await served('exact supported value',            'Moisture is 14.5%.', 'served');
  await served('rounded rendering of 3.84',        'Your plot is 3.8 ha.', 'served');
  await served('supported claim id',               'Study C03 supports this.', 'served');
  await served('no figures at all',                'Mulch your field before the next rain.', 'served');

  console.log('\n--- invented figures are blocked ---');
  await served('invented percentage',              'Moisture is 99%.', 'blocked');
  await served('invented second figure',           'Moisture is 14.5% and yield rose 42%.', 'blocked');
  await served('invented claim id',                'Study C99 supports this.', 'blocked');
  await served('plausible but uncomputed figure',  'You will earn 1.7 tCO2e this year.', 'blocked');

  console.log('\n--- innocuous numbers do not trip it ---');
  await served('small counting number',            'Tap 3 corners to close the shape.', 'served');
  await served('the number 100',                   'That is 100% of your plot.', 'served');

  console.log('\n--- Indic numerals: the hole this suite was written for ---');
  await served('Devanagari supported value',       'ओलावा १४.५% आहे.', 'served');
  await served('Devanagari invented value',        'ओलावा ९९% आहे.', 'blocked');
  await served('Devanagari invented, two figures', 'ओलावा ९९% आणि उत्पादन ४२% वाढेल.', 'blocked');
  await served('Gujarati invented value',          'ભેજ ૯૯% છે.', 'blocked');
  await served('Devanagari innocuous count',       '३ कोपरे निवडा.', 'served');
  await served('localised template is allowed',    'ओलावा १४.५% आहे.', 'served', 'ओलावा १४.५% आहे.');

  console.log('\n--- the reported token is what the model wrote ---');
  {
    const r = check('ओलावा ९९% आहे.', facts, '');
    const token = r.offending.map((o) => o.token).join(',');
    record(token === '९९', 'offending token keeps native numerals', `got "${token}", wanted "९९"`);
  }

  console.log('\n--- failure modes degrade to the template, never to a wrong number ---');
  {
    const r = await guarded(async () => { throw new Error('provider outage'); }, facts, 'TEMPLATE');
    record(r.mode !== 'passed' && r.text === 'TEMPLATE', 'provider outage serves template',
      `mode=${r.mode}`);
  }
  {
    let calls = 0;
    const r = await guarded(async () => { calls += 1; return 'Moisture is 99%.'; }, facts, 'TEMPLATE');
    record(r.text === 'TEMPLATE' && calls === 2, 'retries once then serves template',
      `calls=${calls}, text=${r.text}`);
  }
  {
    let calls = 0;
    const r = await guarded(async () => {
      calls += 1;
      return calls === 1 ? 'Moisture is 99%.' : 'Moisture is 14.5%.';
    }, facts, 'TEMPLATE');
    record(r.mode === 'regenerated' && calls === 2, 'a corrected retry is served',
      `calls=${calls}, mode=${r.mode}`);
  }

  const total = pass + failures.length;
  console.log(`\n${pass}/${total} pass`);
  if (failures.length) {
    console.log(`failed: ${failures.join(', ')}`);
    process.exit(1);
  }
})();
