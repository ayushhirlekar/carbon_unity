import { useEffect, useState } from 'react';
import projectService from '../../services/projectService';
import farmerService from '../../services/farmerService';
import { useToast } from '../../components/common/Toast';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';

const STATUS_TEXT = {
  awaiting_baseline: 'Requires 2nd soil sample to calculate gain',
  no_samples: 'No soil card uploaded yet',
  no_gain_yet: 'Carbon gain not yet recorded',
  contributing: null,
};

export default function FarmerProjectPage() {
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [invites, setInvites] = useState([]);
  const [myMemberships, setMyMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      const [list, mine, inv] = await Promise.all([
        projectService.list(),
        farmerService.listParcels(),
        projectService.myInvitations(),
      ]);
      setProjects(list);
      setParcels(mine);
      setInvites(inv.filter((i) => i.status === 'pending'));

      const joined = [...new Set(mine.filter((p) => p.project).map((p) => p.project.id))];
      const rows = await Promise.all(
        joined.map(async (id) => {
          const [project, members] = await Promise.all([
            projectService.get(id),
            projectService.members(id),
          ]);
          return {
            project,
            mine: members.filter((m) => mine.some((p) => p.farmId === m.farmId)),
          };
        })
      );
      setMyMemberships(rows);
    } catch {
      toast.error('Could not load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const freeParcels = parcels.filter((p) => !p.project);

  const act = async (fn, id, okMsg) => {
    setBusy(id);
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="h-8 w-60"><Skeleton className="h-8 w-full" /></div>
        <div className="h-48 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
        <div className="h-64 rounded-3xl"><Skeleton className="h-full w-full rounded-3xl" /></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans animate-fade-in pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Aggregated Project Pools
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-950 tracking-tight">
          Carbon Pools & Revenue Share
        </h1>
        <p className="text-sm text-surface-600 mt-0.5">
          Join smallholder pools to share verification costs. Payouts are proportional to your plot's measured SOC gain.
        </p>
      </div>

      {/* Pending Invites Alert */}
      {invites.length > 0 && (
        <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
              Invitations to Join Regional Pools
            </span>
            <span className="text-xs font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-full">
              {invites.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {invites.map((i) => (
              <div
                key={i.invitation_id}
                className="p-4 rounded-2xl bg-surface-50 border border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-surface-900">{i.projectName}</h3>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {i.incoming ? 'You were invited by the pool host' : 'You submitted a join request'}
                  </p>
                </div>

                {i.incoming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy === i.invitation_id}
                      onClick={() => act(() => projectService.accept(i.invitation_id), i.invitation_id, 'Joined carbon pool')}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy === i.invitation_id}
                      onClick={() => act(() => projectService.decline(i.invitation_id), i.invitation_id, 'Declined')}
                    >
                      Decline
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-surface-500">Waiting for pool host review</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Pool Memberships */}
      {myMemberships.map(({ project, mine }) => (
        <div key={project.project_id} className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-100">
            <div>
              <span className="text-[10px] font-mono uppercase text-brand-700 font-bold tracking-wider">
                Active Enrolled Pool
              </span>
              <h2 className="text-lg font-bold text-surface-900 tracking-tight">{project.name}</h2>
              <p className="text-xs text-surface-500 mt-0.5">
                {project.memberCount} enrolled farmers · {project.totalAreaHa} hectares pooled
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              ✓ Enrolled Member
            </span>
          </div>

          <div className="space-y-3">
            {mine.map((m) => (
              <div key={m.farmId} className="p-4 rounded-2xl bg-surface-50 border border-surface-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-surface-900">{m.parcelName}</span>
                  {m.status === 'contributing' ? (
                    <span className="text-sm font-mono font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                      {m.sharePct}% Revenue Share
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {STATUS_TEXT[m.status]}
                    </span>
                  )}
                </div>

                {m.status === 'contributing' && (
                  <p className="text-xs text-brand-700 mt-2 font-medium">
                    Yield: <strong>{m.contributionTco2e} tCO₂e</strong> measured gain ({m.baselineSoc}% → {m.currentSoc}% SOC)
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-surface-400 pt-2 border-t border-surface-100 leading-relaxed">
            Revenue payouts from credit sales are allocated strictly based on your plot's measured SOC gain, ensuring fair compensation.
          </p>
        </div>
      ))}

      {/* Available Pools to Join */}
      <div className="bg-white rounded-3xl border border-surface-200 p-6 shadow-card space-y-4">
        <div className="pb-3 border-b border-surface-100">
          <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
            Open Regional Pools You Can Join
          </span>
        </div>

        {projects.length === 0 ? (
          <p className="py-8 text-xs text-surface-400 text-center">
            No open pools found in your region.
          </p>
        ) : (
          <div className="divide-y divide-surface-100">
            {projects.map((p) => {
              const alreadyIn = myMemberships.some((m) => m.project.project_id === p.project_id);
              return (
                <div key={p.project_id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">{p.name}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {p.memberCount} farmers · {p.totalAreaHa} ha {p.district ? ` · District ${p.district}` : ''}
                    </p>
                    {p.methodology && (
                      <span className="text-[11px] text-brand-700 font-mono mt-1 block">
                        Methodology: {p.methodology}
                      </span>
                    )}
                  </div>

                  {alreadyIn ? (
                    <span className="text-xs font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                      Already Joined
                    </span>
                  ) : freeParcels.length === 0 ? (
                    <span className="text-xs text-surface-400">
                      {parcels.length === 0 ? 'Draw plot first' : 'All plots already enrolled'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        disabled={busy === p.project_id}
                        defaultValue=""
                        onChange={(e) => {
                          const farmId = e.target.value;
                          if (!farmId) return;
                          act(
                            () => projectService.requestJoin(p.project_id, { farmId }),
                            p.project_id,
                            'Join request submitted to host'
                          );
                          e.target.value = '';
                        }}
                        className="text-xs font-bold border border-brand-600 text-brand-800 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-subtle"
                      >
                        <option value="">Enroll plot in pool…</option>
                        {freeParcels.map((f) => (
                          <option key={f.farmId} value={f.farmId}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
