const { supabaseAdmin } = require('../config/supabase');

/**
 * Projects — the aggregator model.
 *
 * An admin hosts a project; many smallholder parcels join it, so
 * verification is paid once across N farmers instead of once per
 * farmer. That is the whole reason smallholder carbon is viable.
 */

const isAdmin = (req) => req.user.role === 'admin';

/** Shape a project row plus its roll-up figures. */
const withTotals = async (project) => {
  const { data: contributions } = await supabaseAdmin
    .from('v_project_contributions')
    .select('*')
    .eq('project_id', project.project_id);

  const rows = contributions || [];
  return {
    ...project,
    memberCount: rows.length,
    totalAreaHa: Number(rows.reduce((s, r) => s + Number(r.area_ha || 0), 0).toFixed(4)),
    totalCredits: Number(rows.reduce((s, r) => s + Number(r.contribution_tco2e || 0), 0).toFixed(4)),
    awaitingBaseline: rows.filter(r => r.contribution_status === 'awaiting_baseline').length
  };
};

/**
 * POST /api/projects   (admin)
 *
 * A project has no parcel of its own. Land arrives through
 * membership — which is the difference between this and the old
 * createProject, where "project" was just another word for one farm.
 */
const createProject = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Only a project host can do this' });
    }

    const { name, description, methodology, zone, district, taluka } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Give the project a name' });
    }

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert([{
        host_wallet: req.user.walletAddress,
        name: name.trim(),
        description: description || null,
        methodology: methodology || null,
        zone: zone || null,
        district: district || null,
        taluka: taluka || null
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, message: 'Project created', data });
  } catch (error) {
    console.error('createProject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create project' });
  }
};

/**
 * GET /api/projects
 * Admins see the ones they host; everyone else sees open projects.
 */
const listProjects = async (req, res) => {
  try {
    let q = supabaseAdmin.from('projects').select('*').order('created_at', { ascending: false });
    q = isAdmin(req) ? q.eq('host_wallet', req.user.walletAddress) : q.eq('status', 'open');

    const { data, error } = await q;
    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: await Promise.all((data || []).map(withTotals))
    });
  } catch (error) {
    console.error('listProjects error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load projects' });
  }
};

/**
 * GET /api/projects/:projectId
 */
const getProject = async (req, res) => {
  try {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('project_id', req.params.projectId)
      .maybeSingle();

    if (error || !project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    return res.status(200).json({ success: true, data: await withTotals(project) });
  } catch (error) {
    console.error('getProject error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load project' });
  }
};

/**
 * GET /api/projects/:projectId/members
 *
 * Reads the live contribution view, so each farmer's share is
 * recomputed on every request rather than stored and drifting.
 */
const listMembers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('v_project_contributions')
      .select('*')
      .eq('project_id', req.params.projectId)
      .order('contribution_tco2e', { ascending: false, nullsFirst: false });

    if (error) throw error;

    const wallets = [...new Set((data || []).map(r => r.farmer_wallet).filter(Boolean))];
    const { data: users } = wallets.length
      ? await supabaseAdmin
          .from('users')
          .select('wallet_address, display_name, farmer_code, village:phone')
          .in('wallet_address', wallets)
      : { data: [] };
    const byWallet = Object.fromEntries((users || []).map(u => [u.wallet_address, u]));

    return res.status(200).json({
      success: true,
      data: (data || []).map(r => ({
        farmId: r.farm_id,
        parcelName: r.parcel_name,
        farmerWallet: r.farmer_wallet,
        farmerName: byWallet[r.farmer_wallet]?.display_name || null,
        farmerCode: byWallet[r.farmer_wallet]?.farmer_code || null,
        areaHa: r.area_ha === null ? null : Number(r.area_ha),
        sampleCount: Number(r.sample_count || 0),
        baselineSoc: r.baseline_soc === null ? null : Number(r.baseline_soc),
        currentSoc: r.current_soc === null ? null : Number(r.current_soc),
        deltaSoc: r.delta_soc === null ? null : Number(r.delta_soc),
        contributionTco2e: r.contribution_tco2e === null ? null : Number(r.contribution_tco2e),
        sharePct: Number(r.share_pct || 0),
        status: r.contribution_status
      }))
    });
  } catch (error) {
    console.error('listMembers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load members' });
  }
};

/**
 * POST /api/projects/:projectId/invite   (admin)
 * Invite a farmer by the code they can read out loud.
 */
const inviteFarmer = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Only a project host can invite' });
    }

    const { projectId } = req.params;
    const { farmerCode, farmId, message } = req.body;

    if (!farmerCode) {
      return res.status(400).json({ success: false, message: 'Enter the farmer code' });
    }

    const { data: farmer } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('farmer_code', farmerCode.trim().toUpperCase())
      .maybeSingle();

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'No farmer with that code' });
    }

    const { data, error } = await supabaseAdmin
      .from('project_invitations')
      .insert([{
        project_id: projectId,
        farm_id: farmId || null,
        from_wallet: req.user.walletAddress,
        to_wallet: farmer.wallet_address,
        to_code: farmerCode.trim().toUpperCase(),
        direction: 'admin_invite',
        message: message || null
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'That invitation is already pending' });
      }
      throw error;
    }

    return res.status(201).json({ success: true, message: 'Invitation sent', data });
  } catch (error) {
    console.error('inviteFarmer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invitation' });
  }
};

/**
 * POST /api/projects/:projectId/request   (farmer)
 * Ask to join a project you found.
 */
const requestToJoin = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ success: false, message: 'Only farmers can request to join' });
    }

    const { projectId } = req.params;
    const { farmId, message } = req.body;

    if (!farmId) {
      return res.status(400).json({ success: false, message: 'Choose which plot to enrol' });
    }

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farm_id, farmer_wallet')
      .eq('farm_id', farmId)
      .maybeSingle();

    if (!farm || farm.farmer_wallet !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'That is not your plot' });
    }

    // One active project per parcel. The database enforces this on
    // join, but catching it here gives a readable message instead
    // of a constraint violation.
    const { data: existing } = await supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('farm_id', farmId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This plot is already in a project. Leave that one first.'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('project_invitations')
      .insert([{
        project_id: projectId,
        farm_id: farmId,
        from_wallet: req.user.walletAddress,
        direction: 'farmer_request',
        message: message || null
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ success: false, message: 'You have already asked to join' });
      }
      throw error;
    }

    return res.status(201).json({ success: true, message: 'Request sent', data });
  } catch (error) {
    console.error('requestToJoin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send request' });
  }
};

/**
 * GET /api/projects/invitations/mine
 * Both directions, for whoever is asking.
 */
const myInvitations = async (req, res) => {
  try {
    const me = req.user.walletAddress;

    const { data, error } = await supabaseAdmin
      .from('project_invitations')
      .select('*, projects(name, project_code, methodology)')
      .or(`to_wallet.eq.${me},from_wallet.eq.${me}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: (data || []).map(r => ({
        ...r,
        incoming: r.to_wallet === me,
        projectName: r.projects?.name,
        projectCode: r.projects?.project_code
      }))
    });
  } catch (error) {
    console.error('myInvitations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load invitations' });
  }
};

/**
 * GET /api/projects/:projectId/requests   (admin)
 * Pending requests for the host to approve.
 */
const pendingRequests = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Only a project host can see these' });
    }

    const { data, error } = await supabaseAdmin
      .from('project_invitations')
      .select('*, farms(name, area_ha, village, taluka, soil_type)')
      .eq('project_id', req.params.projectId)
      .eq('direction', 'farmer_request')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    console.error('pendingRequests error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load requests' });
  }
};

/**
 * POST /api/projects/invitations/:invitationId/accept
 *
 * Accepting is what actually creates membership. A host accepts a
 * farmer's request; a farmer accepts a host's invitation. Same row,
 * same transition, decided by which direction it was created in.
 */
const acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const { data: inv } = await supabaseAdmin
      .from('project_invitations')
      .select('*, projects(host_wallet)')
      .eq('invitation_id', invitationId)
      .maybeSingle();

    if (!inv) return res.status(404).json({ success: false, message: 'Invitation not found' });
    if (inv.status !== 'pending') {
      return res.status(409).json({ success: false, message: `Already ${inv.status}` });
    }

    const me = req.user.walletAddress;
    const isHost = inv.projects?.host_wallet === me;
    const isRecipient = inv.to_wallet === me;

    const canAccept =
      (inv.direction === 'farmer_request' && isHost) ||
      (inv.direction !== 'farmer_request' && isRecipient);

    if (!canAccept) {
      return res.status(403).json({ success: false, message: 'This is not yours to accept' });
    }

    let farmId = inv.farm_id;
    if (!farmId) {
      // An invitation sent by code may not name a plot. Use the
      // farmer's only unenrolled one, or ask them to pick.
      const { data: farms } = await supabaseAdmin
        .from('farms')
        .select('farm_id')
        .eq('farmer_wallet', me);

      const candidates = [];
      for (const f of farms || []) {
        const { data: active } = await supabaseAdmin
          .from('project_members')
          .select('farm_id')
          .eq('farm_id', f.farm_id)
          .eq('status', 'active')
          .maybeSingle();
        if (!active) candidates.push(f.farm_id);
      }

      if (candidates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'All your plots are already in a project'
        });
      }
      if (candidates.length > 1) {
        return res.status(400).json({
          success: false,
          message: 'You have more than one free plot — choose which to enrol',
          data: { candidates }
        });
      }
      farmId = candidates[0];
    }

    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .insert([{
        project_id: inv.project_id,
        farm_id: farmId,
        status: 'active',
        invited_by: inv.from_wallet
      }]);

    if (memberError) {
      if (memberError.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'That plot is already active in a project'
        });
      }
      throw memberError;
    }

    await supabaseAdmin
      .from('project_invitations')
      .update({ status: 'accepted' })
      .eq('invitation_id', invitationId);

    return res.status(200).json({ success: true, message: 'Joined' });
  } catch (error) {
    console.error('acceptInvitation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept' });
  }
};

/**
 * POST /api/projects/invitations/:invitationId/decline
 */
const declineInvitation = async (req, res) => {
  try {
    const { data: inv } = await supabaseAdmin
      .from('project_invitations')
      .select('*, projects(host_wallet)')
      .eq('invitation_id', req.params.invitationId)
      .maybeSingle();

    if (!inv) return res.status(404).json({ success: false, message: 'Invitation not found' });

    const me = req.user.walletAddress;
    if (inv.to_wallet !== me && inv.projects?.host_wallet !== me) {
      return res.status(403).json({ success: false, message: 'This is not yours to decline' });
    }

    await supabaseAdmin
      .from('project_invitations')
      .update({ status: 'declined' })
      .eq('invitation_id', req.params.invitationId);

    return res.status(200).json({ success: true, message: 'Declined' });
  } catch (error) {
    console.error('declineInvitation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to decline' });
  }
};

/**
 * POST /api/projects/:projectId/members/:farmId/remove
 *
 * Exit rule: credits already issued stay with the project and any
 * unpaid entitlement stays with the farmer. No new issuance
 * accrues to the parcel. Setting left_at frees it to join
 * elsewhere, because the uniqueness index only covers 'active'.
 */
const removeMember = async (req, res) => {
  try {
    const { projectId, farmId } = req.params;

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('host_wallet')
      .eq('project_id', projectId)
      .maybeSingle();

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farmer_wallet')
      .eq('farm_id', farmId)
      .maybeSingle();

    const me = req.user.walletAddress;
    const isHost = project?.host_wallet === me;
    const isOwner = farm?.farmer_wallet === me;

    if (!isHost && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const { error } = await supabaseAdmin
      .from('project_members')
      .update({ status: isHost ? 'removed' : 'left' })
      .eq('project_id', projectId)
      .eq('farm_id', farmId)
      .eq('status', 'active');

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: isHost ? 'Farmer removed' : 'You have left the project',
      data: { note: 'Credits already issued stay with the project.' }
    });
  } catch (error) {
    console.error('removeMember error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update membership' });
  }
};

module.exports = {
  createProject,
  listProjects,
  getProject,
  listMembers,
  inviteFarmer,
  requestToJoin,
  myInvitations,
  pendingRequests,
  acceptInvitation,
  declineInvitation,
  removeMember
};
