const { supabaseAdmin } = require('../config/supabase');
const weatherFeed = require('../services/sensing/weatherFeed');
const scheduler = require('../services/sensing/scheduler');

/** POST /api/sensing/refresh/:farmId — pull now for one parcel. */
const refreshOne = async (req, res) => {
  try {
    const { farmId } = req.params;
    const { data: rows } = await supabaseAdmin.rpc('fn_all_parcel_centroids');
    const farm = (rows || []).find((f) => f.farm_id === farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found, or it has no boundary yet',
      });
    }
    return res.status(200).json({ success: true, data: await weatherFeed.refreshParcel(farm) });
  } catch (error) {
    console.error('refreshOne error:', error);
    return res.status(502).json({ success: false, message: 'Weather service did not respond' });
  }
};

/** POST /api/sensing/refresh — all parcels (admin). */
const refreshAll = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    return res.status(200).json({ success: true, data: await scheduler.runOnce() });
  } catch (error) {
    console.error('refreshAll error:', error);
    return res.status(500).json({ success: false, message: 'Refresh failed' });
  }
};

/**
 * GET /api/sensing/status/:farmId
 *
 * Reports feed health as well as values, because advice built on
 * a three-day-old reading should say so rather than presenting it
 * as current.
 */
const status = async (req, res) => {
  try {
    const { farmId } = req.params;
    const { data: obs } = await supabaseAdmin
      .from('farm_observations')
      .select('variable, value_num, unit, observed_at, source, quality_flag')
      .eq('farm_id', farmId)
      .order('observed_at', { ascending: false })
      .limit(60);

    const latest = {};
    for (const o of obs || []) if (!latest[o.variable]) latest[o.variable] = o;

    const newest = Object.values(latest)
      .map((o) => o.observed_at)
      .sort()
      .pop();

    const ageDays = newest
      ? Math.floor((Date.now() - new Date(newest).getTime()) / 86400000)
      : null;

    const { data: lastRun } = await supabaseAdmin
      .from('sensing_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      data: {
        latest,
        newestObservation: newest || null,
        ageDays,
        stale: ageDays === null || ageDays > 2,
        lastRun: lastRun || null,
      },
    });
  } catch (error) {
    console.error('sensing status error:', error);
    return res.status(500).json({ success: false, message: 'Could not read feed status' });
  }
};

module.exports = { refreshOne, refreshAll, status };
