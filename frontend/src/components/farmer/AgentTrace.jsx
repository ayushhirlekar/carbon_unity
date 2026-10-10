import { useState } from 'react';

/**
 * How an answer was produced.
 *
 * The graph was built to be invisible — a farmer should get one
 * answer, not "the weather agent returned X". That is right for the
 * farmer and useless for anyone checking whether the thing works,
 * so this makes the machinery openable on purpose: closed by
 * default, one line to expand.
 *
 * Everything here already comes back from /api/agent/chat. No
 * number is computed in this component; that is the whole point of
 * the guard, and a figure invented in the presentation layer would
 * bypass it entirely.
 */

const AGENT_LABEL = {
  sensing: 'Sensing',
  weather: 'Weather',
  agronomy: 'Agronomy',
  crediting: 'Crediting',
  parcel: 'Parcel',
  narrator: 'Narrator',
};

const AGENT_ROLE = {
  sensing: 'read your field readings and their trend',
  weather: 'fetched forecast and days since rain',
  agronomy: 'ran the reasoning engine against the evidence base',
  crediting: 'checked carbon gain and credit readiness',
  parcel: 'read boundary, area and land records',
  narrator: 'wrote the answer, behind the numeric guard',
};

const GUARD_LABEL = {
  passed: { text: 'Checked against your data', tone: 'ok' },
  regenerated: { text: 'Reworded once to remove an unsupported figure', tone: 'warn' },
  template_fallback: { text: 'Plain wording — the written answer used a figure not in your data', tone: 'warn' },
};

/**
 * Quota is not a guard rejection and should not read like one.
 *
 * "The written answer used a figure not in your data" accuses the
 * model of something it never got the chance to do. The figures
 * are identical either way — they were computed before any model
 * was involved — and saying so is the difference between an
 * answer that looks degraded and one that looks deliberate.
 */
const QUOTA_NOTE =
  'Plain wording today — the daily AI rewording limit has been reached. The figures are unaffected.';

/** One line summarising what an agent actually returned. */
const contribution = (agent, facts) => {
  if (!facts) return null;

  if (agent === 'sensing') {
    const latest = facts.sensing?.latest || {};
    const m = latest.moisture_percent;
    const vars = Object.keys(latest).length;
    if (m) return `moisture ${m.value_num}${m.unit || ''} · ${vars} variable${vars === 1 ? '' : 's'} tracked`;
    return vars ? `${vars} variables tracked` : 'no readings yet';
  }

  if (agent === 'weather') {
    const w = facts.weather;
    if (!w || w.error) return 'unavailable';
    return `${w.rainNext7dMm} mm forecast · ${w.daysSinceRain} days since rain`;
  }

  if (agent === 'agronomy') {
    const a = facts.assessment;
    if (!a) return null;
    if (a.status !== 'ok') return `not enough data${a.missing?.length ? ` — needs ${a.missing.join(', ')}` : ''}`;
    const lf = a.limitingFactor;
    return lf ? `limiting factor: ${String(lf.variable).replace(/_/g, ' ')} at ${lf.value}${lf.unit || ''}` : 'assessed';
  }

  if (agent === 'crediting') {
    const c = facts.crediting;
    if (!c || c.error) return 'unavailable';
    if (c.status === 'gaining') return `carbon ${c.baselineSoc}% → ${c.currentSoc}%`;
    return String(c.status || '').replace(/_/g, ' ');
  }

  if (agent === 'parcel') {
    const p = facts.parcel;
    return p?.areaHa ? `${p.areaHa} ha` : null;
  }

  return null;
};

export default function AgentTrace({ agentsUsed, facts, guardStatus, historyUsed, modelNotice }) {
  const [open, setOpen] = useState(false);

  const agents = (agentsUsed || []).filter((a) => a !== 'narrator');
  if (!agents.length && !guardStatus) return null;

  const guard = GUARD_LABEL[guardStatus];
  const rejected = facts?.assessment?.rejected || [];
  const claims = facts?.assessment?.claims || [];
  const confidence = facts?.assessment?.confidence;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-medium text-surface-500 underline decoration-dotted hover:text-surface-700"
      >
        {open ? 'Hide' : 'How this answer was produced'}
        {!open && agents.length ? ` · ${agents.length} agents` : ''}
      </button>

      {open && (
        <div className="mt-2 space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-3 text-xs">
          {/* Which agents ran, and what each returned. */}
          <div>
            <p className="font-semibold text-surface-700">Agents that ran</p>
            <ul className="mt-1.5 space-y-1.5">
              {agents.map((a) => {
                const detail = contribution(a, facts);
                return (
                  <li key={a} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span className="min-w-0">
                      <span className="font-medium text-surface-900">{AGENT_LABEL[a] || a}</span>
                      <span className="text-surface-500"> — {AGENT_ROLE[a] || 'ran'}</span>
                      {detail && (
                        <span className="mt-0.5 block font-mono text-[11px] text-surface-700">{detail}</span>
                      )}
                    </span>
                  </li>
                );
              })}
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-surface-400" />
                <span>
                  <span className="font-medium text-surface-900">Narrator</span>
                  <span className="text-surface-500"> — {AGENT_ROLE.narrator}</span>
                </span>
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-surface-500">
              Agents gather and compute; only the narrator writes. Every figure above existed
              before any wording was generated.
            </p>
          </div>

          {/* The guard verdict. */}
          {modelNotice === 'quota_exhausted' ? (
            <div>
              <p className="font-semibold text-surface-700">Wording</p>
              <p className="mt-1 text-amber-700">{QUOTA_NOTE}</p>
            </div>
          ) : guard && (
            <div>
              <p className="font-semibold text-surface-700">Numeric guard</p>
              <p className={`mt-1 ${guard.tone === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {guard.text}
              </p>
            </div>
          )}

          {/* Evidence, including what was refused — the part a
              similarity search could not tell you. */}
          {(claims.length > 0 || rejected.length > 0) && (
            <div>
              <p className="font-semibold text-surface-700">Evidence considered</p>
              {claims.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {claims.map((c) => (
                    <li key={c.claim_id} className="text-emerald-800">
                      ✓ {c.claim_id} {c.summary ? `— ${c.summary}` : ''}
                      {c.effect_size === null && <span className="text-surface-500"> (no effect size)</span>}
                    </li>
                  ))}
                </ul>
              )}
              {rejected.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {rejected.map((c) => (
                    <li key={c.claim_id} className="text-surface-500">
                      ✕ {c.claim_id} — {c.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Confidence as four components, never one number: the
              remedy differs depending on which one is weakest. */}
          {confidence && (
            <div>
              <p className="font-semibold text-surface-700">Confidence</p>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[11px] text-surface-700">
                {['evidence', 'data', 'context', 'temporal']
                  .filter((k) => confidence[k] !== undefined)
                  .map((k) => (
                    <span key={k}>{k}: {confidence[k]}</span>
                  ))}
              </div>
              {confidence.limitedBy && (
                <p className="mt-1 text-surface-500">Limited mainly by {confidence.limitedBy}.</p>
              )}
            </div>
          )}

          {(historyUsed > 0 || modelNotice) && (
            <div className="border-t border-surface-200 pt-2 text-[11px] text-surface-500">
              {historyUsed > 0 && <p>Saw {historyUsed} earlier message{historyUsed === 1 ? '' : 's'} from this conversation.</p>}
              {modelNotice && <p className="text-amber-700">Model notice: {modelNotice}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
