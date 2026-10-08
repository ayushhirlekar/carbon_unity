const { supabaseAdmin } = require('../config/supabase');
const watchdog = require('../agents/watchdog');

/** GET /api/alerts */
const list = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .select('*, farms(name)')
      .eq('wallet_address', req.user.walletAddress)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: (data || []).map((a) => ({ ...a, parcelName: a.farms?.name || null })),
      unread: (data || []).filter((a) => !a.read_at).length,
    });
  } catch (error) {
    console.error('alerts list error:', error);
    return res.status(500).json({ success: false, message: 'Could not load alerts' });
  }
};

/** POST /api/alerts/:alertId/read */
const markRead = async (req, res) => {
  try {
    await supabaseAdmin
      .from('alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('alert_id', req.params.alertId)
      .eq('wallet_address', req.user.walletAddress);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not update' });
  }
};

/** POST /api/alerts/run — evaluate the rules now. */
const run = async (req, res) => {
  try {
    const results = await watchdog.runAll();
    return res.status(200).json({
      success: true,
      data: { parcels: results.length, raised: results.reduce((s, r) => s + (r.raised?.length || 0), 0), results },
    });
  } catch (error) {
    console.error('watchdog run error:', error);
    return res.status(500).json({ success: false, message: 'Watchdog run failed' });
  }
};

module.exports = { list, markRead, run };
