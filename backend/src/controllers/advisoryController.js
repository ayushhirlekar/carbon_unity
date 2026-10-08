const { supabaseAdmin } = require('../config/supabase');
const { assess } = require('../reasoning/assess');

/**
 * Advisory endpoints.
 *
 * These call the deterministic engine only. No language model is
 * reachable from here — that lives behind the agent layer and can
 * never alter a number this produced.
 */

const ownsFarm = async (farmId, wallet, role) => {
  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('farmer_wallet')
    .eq('farm_id', farmId)
    .maybeSingle();
  if (!farm) return { found: false };
  return { found: true, allowed: role === 'admin' || farm.farmer_wallet === wallet };
};

/** POST /api/advisory/assess/:farmId */
const runAssessment = async (req, res) => {
  try {
    const { farmId } = req.params;
    const own = await ownsFarm(farmId, req.user.walletAddress, req.user.role);
    if (!own.found) return res.status(404).json({ success: false, message: 'Plot not found' });
    if (!own.allowed) return res.status(403).json({ success: false, message: 'This is not your plot' });

    const assessment = await assess(farmId);

    // Persisted so the dashboard can render the last answer with
    // no network, and so an answer can be re-checked later against
    // the numbers it was based on.
    await supabaseAdmin.from('assessments').insert([{
      farm_id: farmId,
      limiting_factor: assessment.limitingFactor?.variable || null,
      ranked_drivers: assessment.rankedDrivers || [],
      eligible_claims: assessment.eligibleClaims || [],
      rejected_claims: assessment.rejectedClaims || [],
      sequence: assessment.sequence || [],
      confidence_breakdown: assessment.confidence || null,
      assessment_json: assessment,
    }]).select().maybeSingle();

    return res.status(200).json({ success: true, data: assessment });
  } catch (error) {
    console.error('runAssessment error:', error);
    return res.status(500).json({ success: false, message: 'Could not assess this plot' });
  }
};

/** GET /api/advisory/:farmId/latest */
const latestAssessment = async (req, res) => {
  try {
    const { farmId } = req.params;
    const own = await ownsFarm(farmId, req.user.walletAddress, req.user.role);
    if (!own.found) return res.status(404).json({ success: false, message: 'Plot not found' });
    if (!own.allowed) return res.status(403).json({ success: false, message: 'This is not your plot' });

    const { data } = await supabaseAdmin
      .from('assessments')
      .select('*')
      .eq('farm_id', farmId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.status(200).json({ success: true, data: data?.assessment_json || null });
  } catch (error) {
    console.error('latestAssessment error:', error);
    return res.status(500).json({ success: false, message: 'Could not load the assessment' });
  }
};

/** GET /api/advisory/evidence  — the public evidence base */
const listEvidence = async (req, res) => {
  try {
    const { metric } = req.query;
    let q = supabaseAdmin
      .from('evidence_claims')
      .select('*, evidence_sources(citation, doi, year, study_type, location)');
    if (metric) q = q.eq('target_metric', metric);

    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    console.error('listEvidence error:', error);
    return res.status(500).json({ success: false, message: 'Could not load evidence' });
  }
};

module.exports = { runAssessment, latestAssessment, listEvidence };
