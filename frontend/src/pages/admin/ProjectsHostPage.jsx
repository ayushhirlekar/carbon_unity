import { useEffect, useState } from 'react';
import projectService from '../../services/projectService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

export default function ProjectsHostPage() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', methodology: '', district: '', taluka: '',
  });

  const load = async () => {
    try {
      setProjects(await projectService.list());
    } catch {
      toast.error('Could not load projects');
    } finally {
      setLoading(false);
    }
  };

  const open = async (p) => {
    setSelected(p);
    try {
      const [m, r] = await Promise.all([
        projectService.members(p.project_id),
        projectService.pendingRequests(p.project_id),
      ]);
      setMembers(m);
      setRequests(r);
    } catch {
      toast.error('Could not load project detail');
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Give the project a name');
    setBusy('create');
    try {
      await projectService.create(form);
      toast.success('Carbon project created');
      setForm({ name: '', description: '', methodology: '', district: '', taluka: '' });
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create project');
    } finally {
      setBusy(null);
    }
  };

  const act = async (fn, id, msg) => {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      await open(selected);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 rounded-2xl"><Skeleton className="h-full w-full rounded-2xl" /></div>
          <div className="lg:col-span-2 h-96 rounded-2xl"><Skeleton className="h-full w-full rounded-2xl" /></div>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all';

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Farmer Aggregation Pool
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
            Group Carbon Projects
          </h1>
          <p className="text-sm text-surface-600 mt-0.5">
            Aggregate smallholder parcels under institutional MRV to optimize verification costs
          </p>
        </div>

        {!creating && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreating(true)}
            className="shadow-glow-brand"
          >
            + New Pool
          </Button>
        )}
      </div>

      {/* Creation Form Modal/Card */}
      {creating && (
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4 animate-scale-in">
          <div className="border-b border-surface-100 pb-3">
            <h2 className="text-base font-bold text-surface-900 tracking-tight">
              Initialize New Aggregated Pool
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              A pool has no land of its own — smallholder parcels join via invitation code or request.
            </p>
          </div>

          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                className={inputClass}
                placeholder="Project Pool Name *"
                value={form.name}
                onChange={set('name')}
                required
              />
              <input
                className={inputClass}
                placeholder="Methodology (e.g. VM0042 Soil Carbon)"
                value={form.methodology}
                onChange={set('methodology')}
              />
              <input
                className={inputClass}
                placeholder="District (e.g. Satara, Kolhapur)"
                value={form.district}
                onChange={set('district')}
              />
              <input
                className={inputClass}
                placeholder="Taluka (Sub-district)"
                value={form.taluka}
                onChange={set('taluka')}
              />
            </div>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Scope and agro-ecological description..."
              value={form.description}
              onChange={set('description')}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={busy === 'create'}
              >
                {busy === 'create' ? 'Creating Pool...' : 'Create Carbon Pool'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Pool Selector */}
        <div className="bg-white rounded-3xl border border-surface-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-500">
              Active Pools
            </span>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
              {projects.length}
            </span>
          </div>

          {projects.length === 0 ? (
            <p className="px-5 py-12 text-xs text-surface-400 text-center">
              No aggregated pools created yet.
            </p>
          ) : (
            <div className="divide-y divide-surface-100">
              {projects.map((p) => (
                <button
                  key={p.project_id}
                  onClick={() => open(p)}
                  className={`w-full text-left p-4 transition-all ${
                    selected?.project_id === p.project_id
                      ? 'bg-brand-50/70 border-l-4 border-brand-600'
                      : 'hover:bg-surface-50'
                  }`}
                >
                  <div className="text-sm font-bold text-surface-900 truncate">{p.name}</div>
                  <div className="text-xs text-surface-500 mt-1 flex items-center gap-2">
                    <span>{p.memberCount} farmer{p.memberCount === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span>{p.totalAreaHa} ha</span>
                    <span>•</span>
                    <span className="font-semibold text-brand-800">{p.totalCredits} tCO₂e</span>
                  </div>
                  <div className="text-[10px] font-mono font-bold tracking-wider text-brand-700 mt-1.5 bg-brand-50 inline-block px-2 py-0.5 rounded">
                    CODE: {p.project_code}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        {selected ? (
          <div className="space-y-6">
            {/* Pool Overview Card */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-100">
                <div>
                  <h2 className="text-lg font-bold text-surface-900 tracking-tight">{selected.name}</h2>
                  <p className="text-xs text-surface-500 mt-0.5">
                    Pool Code <strong className="font-mono text-brand-800">{selected.project_code}</strong>
                    {selected.district ? ` · District ${selected.district}` : ''}
                  </p>
                </div>
              </div>

              {/* 3 Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Farmers', selected.memberCount, 'Members'],
                  ['Area', selected.totalAreaHa, 'Hectares'],
                  ['Carbon', selected.totalCredits, 'tCO₂e Gain'],
                ].map(([label, val, unit]) => (
                  <div key={label} className="p-3.5 rounded-2xl bg-surface-50 border border-surface-100 text-center">
                    <span className="text-lg font-mono font-bold text-surface-900 block">{val}</span>
                    <span className="text-[11px] font-semibold text-surface-500 mt-0.5 block">{unit}</span>
                  </div>
                ))}
              </div>

              {/* Invite Code Row */}
              <div className="flex gap-2 pt-2">
                <input
                  className={inputClass}
                  placeholder="Enter 8-digit Farmer Code (e.g. KNS7P4VG)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                />
                <Button
                  variant="primary"
                  size="md"
                  disabled={busy === 'invite' || !inviteCode.trim()}
                  loading={busy === 'invite'}
                  onClick={() =>
                    act(
                      () => projectService.invite(selected.project_id, { farmerCode: inviteCode.trim() }),
                      'invite',
                      'Invitation dispatched'
                    ).then(() => setInviteCode(''))
                  }
                  className="shrink-0 shadow-subtle"
                >
                  Invite Farmer
                </Button>
              </div>
            </div>

            {/* Pending Requests */}
            {requests.length > 0 && (
              <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
                    Join Requests Awaiting Audit
                  </span>
                  <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {requests.length} Pending
                  </span>
                </div>

                <div className="space-y-3">
                  {requests.map((r) => (
                    <div
                      key={r.invitation_id}
                      className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-surface-900">{r.farms?.name || 'Registered Plot'}</div>
                        <div className="text-xs text-surface-500 mt-0.5">
                          {r.farms?.area_ha} ha {r.farms?.village ? ` · ${r.farms.village}` : ''}
                          {r.farms?.soil_type ? ` · ${r.farms.soil_type}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy === r.invitation_id}
                          onClick={() =>
                            act(() => projectService.accept(r.invitation_id), r.invitation_id, 'Farmer approved')
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy === r.invitation_id}
                          onClick={() =>
                            act(() => projectService.decline(r.invitation_id), r.invitation_id, 'Declined')
                          }
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member List & Share Breakdown */}
            <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
              <div className="pb-3 border-b border-surface-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
                  Enrolled Farmers & Carbon Yield Share
                </span>
                <span className="text-xs font-semibold text-surface-500">
                  {members.length} plot(s)
                </span>
              </div>

              {members.length === 0 ? (
                <p className="py-8 text-xs text-surface-400 text-center">
                  No farmers have joined this pool yet. Invite farmers using their 8-character ID code.
                </p>
              ) : (
                <div className="divide-y divide-surface-100">
                  {members.map((m) => (
                    <div
                      key={m.farmId}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-surface-900 truncate">
                          {m.parcelName} {m.farmerName ? `· ${m.farmerName}` : ''}
                        </div>
                        <div className="text-xs text-surface-500 mt-0.5">
                          {m.areaHa} ha · Code: <span className="font-mono">{m.farmerCode || '—'}</span>
                          {m.deltaSoc !== null && ` · Baseline SOC ${m.baselineSoc}% → ${m.currentSoc}%`}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {m.status === 'contributing' ? (
                          <>
                            <div className="text-sm font-mono font-bold text-brand-800">{m.sharePct}% share</div>
                            <div className="text-[11px] text-surface-500">{m.contributionTco2e} tCO₂e</div>
                          </>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {m.status === 'awaiting_baseline'
                              ? 'Awaiting 2nd Card'
                              : m.status === 'no_samples'
                              ? 'No Soil Card'
                              : 'No Gain'}
                          </span>
                        )}
                        <button
                          disabled={busy === m.farmId}
                          onClick={() =>
                            act(
                              () => projectService.removeMember(selected.project_id, m.farmId),
                              m.farmId,
                              'Farmer removed'
                            )
                          }
                          className="block text-[11px] font-semibold text-rose-600 hover:underline mt-1 ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-surface-400 pt-3 border-t border-surface-100 leading-relaxed">
                Shares are distributed proportionally to each farmer plot's audited soil organic carbon gain.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-surface-200 p-16 text-center shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-500 flex items-center justify-center mx-auto mb-3 shadow-subtle">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </div>
            <p className="text-sm font-bold text-surface-700">Select a pool on the left</p>
            <p className="text-xs text-surface-400 mt-0.5">
              Review registered farmer members, approve join requests, or calculate revenue shares.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
