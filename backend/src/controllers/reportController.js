const reportService = require('../services/reportService');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Daily reports.
 *
 * Ownership is checked on every route. A report contains a field's
 * readings, its weaknesses and what its farmer has been advised to
 * do, which is commercially and personally sensitive even though
 * none of it is a secret in the cryptographic sense.
 */

const ownsFarm = async (farmId, user) => {
  const { data: farm } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, farmer_wallet')
    .eq('farm_id', farmId)
    .maybeSingle();

  if (!farm) return { ok: false, status: 404, message: 'Parcel not found' };
  if (farm.farmer_wallet !== user?.walletAddress && user?.role !== 'admin') {
    return { ok: false, status: 403, message: 'That parcel is not yours' };
  }
  return { ok: true, farm };
};

/** GET /api/reports/:farmId/latest */
const latest = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const report = await reportService.latestForFarm(req.params.farmId);
    return res.json({ success: true, report });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** GET /api/reports/:farmId — recent reports, summaries only. */
const history = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const reports = await reportService.historyForFarm(req.params.farmId, Number(req.query.limit) || 14);
    return res.json({ success: true, reports });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/reports/:farmId/generate
 *
 * The demo's "Generate report now". Also the honest way to retry a
 * morning the job failed, rather than waiting a day.
 *
 * force=true replaces today's report. Default is not to, so this
 * is safe to press twice — and so an existing report, which the
 * farmer may already have read and acted on, is not quietly
 * rewritten by a stray click.
 */
const generate = async (req, res) => {
  try {
    const owned = await ownsFarm(req.params.farmId, req.user);
    if (!owned.ok) return res.status(owned.status).json({ success: false, message: owned.message });

    const force = req.query.force === '1' || req.body?.force === true;
    const result = await reportService.generateForFarm(owned.farm, { force });
    const report = await reportService.latestForFarm(req.params.farmId);

    return res.json({ success: true, result, report });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** POST /api/reports/run — all parcels. Admin only. */
const runAll = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const results = await reportService.generateAll({ force: req.query.force === '1' });
    return res.json({ success: true, results });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { latest, history, generate, runAll };
