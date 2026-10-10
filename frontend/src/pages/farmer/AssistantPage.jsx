import { useEffect, useRef, useState } from 'react';
import farmerService from '../../services/farmerService';
import agentService from '../../services/agentService';
import AgentTrace from '../../components/farmer/AgentTrace';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

const LANGS = [
  { v: 'en', l: 'English' },
  { v: 'mr', l: 'मराठी' },
  { v: 'hi', l: 'हिंदी' },
];

const SUGGESTIONS = [
  'How is my field doing?',
  'What should I do first?',
  'When should I water?',
  'Can I claim carbon credits yet?',
];

const pretty = (v) => String(v || '').replace(/_/g, ' ');

export default function AssistantPage() {
  const toast = useToast();
  const endRef = useRef(null);

  const [parcels, setParcels] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [facts, setFacts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    farmerService.listParcels()
      .then((list) => {
        setParcels(list);
        if (list.length) setFarmId(list[0].farmId);
      })
      .catch(() => toast.error('Could not load your plots'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!farmId) return;
    agentService.assess(farmId).then(setAssessment).catch(() => setAssessment(null));
  }, [farmId]);

  /**
   * Restore the conversation for this plot.
   *
   * Without this the thread lived only in React state, so changing
   * window or reloading discarded it — the answers were being
   * written to agent_messages the whole time and simply never read
   * back. A farmer who asked something yesterday should find it.
   *
   * The stored conversationId is preferred so a reload rejoins the
   * same thread instead of quietly starting a second one against
   * the same plot.
   */
  useEffect(() => {
    if (!farmId) return;
    let alive = true;

    agentService.history(farmId)
      .then((convs) => {
        if (!alive || !convs?.length) return;

        const storedId = (() => {
          try { return localStorage.getItem(`cu.conv.${farmId}`); } catch { return null; }
        })();

        const conv = convs.find((c) => c.conversation_id === storedId) || convs[0];
        const msgs = [...(conv.agent_messages || [])]
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .map((m) => ({
            role: m.role,
            content: m.content,
            guardStatus: m.guard_status,
            agentsUsed: m.agents_used,
            assessment: m.assessment,
            restored: true,
          }));

        if (msgs.length) {
          setMessages(msgs);
          setConversationId(conv.conversation_id);
        }
      })
      .catch(() => { /* an empty assistant is fine; a crashed one is not */ });

    return () => { alive = false; };
  }, [farmId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (textToSend) => {
    const q = (textToSend || question).trim();
    if (!q || !farmId || busy) return;

    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setBusy(true);

    try {
      const res = await agentService.ask(farmId, {
        question: q,
        language,
        conversationId,
      });

      setConversationId(res.conversationId);
      try {
        if (res.conversationId) localStorage.setItem(`cu.conv.${farmId}`, res.conversationId);
      } catch { /* private mode: the thread still works for this session */ }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          guardStatus: res.guardStatus,
          modelAvailable: res.modelAvailable,
          agentsUsed: res.agentsUsed,
          assessment: res.assessment,
          facts: res.facts,
          historyUsed: res.historyUsed,
          modelNotice: res.modelNotice,
        },
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'The assistant could not reply');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection timed out. Please try asking again.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast.info('Voice input not supported in this browser');

    const r = new SR();
    r.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast.error('Could not hear audio'); };
    r.onresult = (e) => {
      const heard = e.results[0]?.[0]?.transcript;
      if (heard) {
        setQuestion(heard);
        send(heard);
      }
    };
    r.start();
  };

  const refreshField = async () => {
    if (!farmId) return;
    setBusy(true);
    try {
      await agentService.refreshSensing(farmId);
      toast.success('Field satellite & weather readings updated');
      send('How is my field doing?');
    } catch {
      toast.error('Could not reach the sensing service');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
          <div className="h-96 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
        </div>
      </div>
    );
  }

  if (parcels.length === 0) {
    return (
      <div className="space-y-6 font-sans">
        <h1 className="text-2xl font-extrabold text-surface-950">AI Agronomy Advisor</h1>
        <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 01-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.688A1.125 1.125 0 003 6.694v13.366c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 011.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-surface-800">Draw a plot boundary first</p>
          <p className="text-xs text-surface-500 mt-1">
            The assistant analyzes your specific field satellite telemetry and soil readings, not generic tips.
          </p>
        </div>
      </div>
    );
  }

  const seq = assessment?.sequence || [];

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Field-Grounded Reasoning
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
            AI Advisory Agent
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            Peer-reviewed scientific reasoning matched to your soil & satellite Sentinel-2 readings
          </p>
        </div>

        {/* Parcel & Language Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={farmId}
            onChange={(e) => {
              setFarmId(e.target.value);
              // Cleared rather than kept: the restore effect above
              // loads the newly selected plot's own thread, and
              // leaving the previous plot's messages on screen
              // would attribute them to the wrong field.
              setMessages([]);
              setAssessment(null);
              setConversationId(null);
            }}
            className="text-xs font-bold border border-surface-200 rounded-xl px-3 py-2 bg-white text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-subtle"
          >
            {parcels.map((p) => (
              <option key={p.farmId} value={p.farmId}>{p.name}</option>
            ))}
          </select>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs font-bold border border-surface-200 rounded-xl px-3 py-2 bg-white text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-subtle"
          >
            {LANGS.map((l) => (
              <option key={l.v} value={l.v}>{l.l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Left Column: Chat Conversation Stream */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card min-h-[22rem] flex flex-col justify-between space-y-4">
            {messages.length === 0 ? (
              <div className="py-12 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto shadow-subtle">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-surface-900">
                  Ask about this field plot
                </h3>
                <p className="text-xs text-surface-500 leading-relaxed">
                  Answers cite real agronomy papers and use your parcel's soil health card and weather.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-50 hover:bg-brand-50 text-surface-700 hover:text-brand-800 border border-surface-200 transition-all hover:scale-105"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto">
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-brand-800 to-brand-700 text-white rounded-br-none shadow-subtle'
                          : 'bg-surface-50 border border-surface-200 text-surface-900 rounded-bl-none shadow-subtle'
                      }`}
                    >
                      {m.content}
                    </div>

                    {m.role === 'assistant' && m.guardStatus && (
                      <div className="mt-1 px-1">
                        <span className="text-[10px] text-surface-400">
                          {m.guardStatus === 'template_fallback'
                            ? 'Deterministic rule-based reply'
                            : 'Audited against parcel telemetry'}
                          {m.restored ? ' · from an earlier session' : ''}
                        </span>
                        {m.modelNotice === 'quota_exhausted' && (
                          <p className="mt-0.5 text-[10px] text-amber-700">
                            Plain wording today — the AI rewording limit has been reached.
                            The figures are unaffected.
                          </p>
                        )}
                        <AgentTrace
                          agentsUsed={m.agentsUsed}
                          facts={m.facts}
                          guardStatus={m.guardStatus}
                          historyUsed={m.historyUsed}
                          modelNotice={m.modelNotice}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {busy && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-700 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <span>Analyzing satellite telemetry & scientific literature…</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Prompt Input Dock */}
          <div className="p-2 rounded-2xl bg-white border border-surface-200 shadow-card flex items-center gap-2 focus-within:ring-2 focus-within:ring-brand-500">
            <button
              onClick={listen}
              aria-label="Speak Question"
              className={`p-2.5 rounded-xl transition-all ${
                listening
                  ? 'bg-rose-50 text-rose-600 animate-pulse ring-2 ring-rose-400'
                  : 'text-surface-400 hover:text-brand-700 hover:bg-surface-50'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>

            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !busy && send()}
              placeholder="Ask a question about this field..."
              className="flex-1 bg-transparent text-sm text-surface-900 outline-none placeholder:text-surface-400"
            />

            <Button
              variant="primary"
              size="sm"
              disabled={busy || !question.trim()}
              onClick={() => send()}
              className="shadow-subtle"
            >
              Ask
            </Button>
          </div>

          <button
            onClick={refreshField}
            disabled={busy}
            className="text-xs font-bold text-brand-700 hover:text-brand-900 inline-flex items-center gap-1.5"
          >
            <span>↻ Refresh Sentinel-2 & weather readings for this plot</span>
          </button>
        </div>

        {/* Right Column: Reasoning & Scientific Grounding Cards */}
        <div className="space-y-4">
          {assessment?.status === 'insufficient_data' && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <span className="font-bold block uppercase mb-1">Awaiting Data</span>
              <p className="leading-relaxed">{assessment.message}</p>
            </div>
          )}

          {assessment?.limitingFactor && (
            <div className="bg-white rounded-3xl border border-surface-200 p-5 shadow-card space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-surface-400 tracking-wider block">
                Agronomic Limiting Factor
              </span>
              <div className="text-sm font-bold text-surface-900">
                {pretty(assessment.limitingFactor.variable)}
              </div>
              <p className="text-xs text-surface-500">
                Value: <strong>{assessment.limitingFactor.value}{assessment.limitingFactor.unit}</strong> · Suitability Score: {assessment.limitingFactor.score}
              </p>
            </div>
          )}

          {seq.length > 0 && (
            <div className="bg-white rounded-3xl border border-surface-200 p-5 shadow-card space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold text-surface-400 tracking-wider block">
                Recommended Interventions
              </span>
              <div className="space-y-3">
                {seq.map((s, i) => (
                  <div key={i} className="flex gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center shrink-0">
                      {s.stage}
                    </span>
                    <div>
                      <span className={`font-bold block ${s.deferred ? 'text-surface-500' : 'text-surface-900'}`}>
                        {s.name}
                      </span>
                      <p className="text-[11px] text-surface-400 leading-snug mt-0.5">{s.rationale}</p>
                      {s.deferred && (
                        <span className="text-[10px] font-semibold text-amber-700 block mt-0.5">
                          Deferred: {s.revisitWhen}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assessment?.confidence && (
            <div className="bg-white rounded-3xl border border-surface-200 p-5 shadow-card space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold text-surface-400 tracking-wider block">
                Evidence Confidence
              </span>
              {['data', 'evidence', 'context', 'agreement'].map((k) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-surface-600 capitalize">
                    <span>{k}</span>
                    <span>{Math.round(assessment.confidence[k] * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${Math.round(assessment.confidence[k] * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {assessment?.eligibleClaims?.length > 0 && (
            <div className="bg-white rounded-3xl border border-surface-200 p-5 shadow-card space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold text-surface-400 tracking-wider block">
                Matched Peer-Reviewed Studies
              </span>
              <div className="space-y-2.5">
                {assessment.eligibleClaims.slice(0, 3).map((c) => (
                  <div key={c.claimId} className="text-xs p-2.5 rounded-xl bg-surface-50 border border-surface-100 space-y-1">
                    <p className="font-semibold text-surface-900 leading-snug">{c.statement}</p>
                    <span className="text-[10px] text-surface-400 block font-mono">
                      Ref #{c.claimId} · Context Match {c.contextScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
