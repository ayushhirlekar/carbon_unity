const devices = require('../services/deviceService');
const watchdog = require('../agents/watchdog');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Device ingest.
 *
 * The one endpoint in this application authenticated by something
 * other than a wallet signature, because a soil probe cannot hold
 * a wallet. It is also the only unauthenticated-by-user write path
 * into data the reasoning engine consumes, which makes it the most
 * security-relevant surface added by the simulation work:
 *
 *   A leaked device key does not read anything. It writes
 *   observations that feed the engine, which produces the advice a
 *   farmer acts on in their field. The damage model is not a data
 *   breach, it is bad agronomy delivered with confidence.
 *
 * Hence: hashed keys, plausibility limits per variable, a rate
 * limit per device, and rejection counts reported back rather than
 * swallowed.
 */

// Requests per device per window. A real probe reports every few
// minutes; the simulator at demo speed is the heaviest legitimate
// client and sits far below this.
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const MAX_READINGS_PER_REQUEST = 500;

// In-process, deliberately. A shared store would be correct across
// several instances; this pilot runs one, and an in-memory limiter
// that actually works beats a distributed one that is not wired up.
const hits = new Map();

const rateLimited = (deviceId) => {
  const now = Date.now();
  const entry = hits.get(deviceId);

  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    hits.set(deviceId, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
};

/**
 * POST /api/ingest
 * Header: x-device-key
 * Body:   { readings: [{ variable, value, unit?, observed_at? }] }
 */
const ingest = async (req, res) => {
  try {
    const key = req.header('x-device-key');
    const device = await devices.authenticate(key);

    // One message for a missing key and for a wrong one: telling a
    // caller which it was confirms whether a key exists.
    if (!device) {
      return res.status(401).json({ success: false, message: 'Unknown or inactive device key' });
    }

    if (rateLimited(device.device_id)) {
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded: more than ${RATE_LIMIT} requests per minute`,
      });
    }

    const readings = req.body?.readings;
    if (!Array.isArray(readings) || !readings.length) {
      return res.status(400).json({ success: false, message: 'readings[] is required' });
    }
    if (readings.length > MAX_READINGS_PER_REQUEST) {
      return res.status(413).json({
        success: false,
        message: `At most ${MAX_READINGS_PER_REQUEST} readings per request`,
      });
    }

    // The shared path. The in-app demo calls this same function,
    // so the button and a real probe cannot diverge.
    const out = await devices.ingestBatch({ device, readings });

    return res.json({
      success: true,
      device_id: device.device_id,
      source: out.source,
      inserted: out.inserted,
      rejected: out.rejected,
      // Returned so a misconfigured sensor is diagnosable from the
      // client side instead of only showing up as missing data.
      rejections: out.rejections.slice(0, 20),
      alerts: out.alerts.raised,
      resolved: out.alerts.resolved,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/devices
 * Register a device against a parcel the caller owns.
 * Returns the raw key ONCE.
 */
const createDevice = async (req, res) => {
  try {
    const wallet = req.user?.walletAddress;
    const { farm_id: farmId, device_type: deviceType, label, is_simulated: isSimulated } = req.body || {};

    if (!farmId) return res.status(400).json({ success: false, message: 'farm_id is required' });

    // Ownership, checked here rather than trusted: a device writes
    // to a parcel's record, so attaching one to someone else's land
    // would let a stranger shape their advice.
    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farm_id, farmer_wallet, name')
      .eq('farm_id', farmId)
      .single();

    if (!farm) return res.status(404).json({ success: false, message: 'Parcel not found' });
    if (farm.farmer_wallet !== wallet && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'That parcel is not yours' });
    }

    const { device, apiKey } = await devices.registerDevice({
      farmId,
      deviceType: deviceType || 'soil_probe',
      label,
      // Real hardware is an explicit act; anything created through
      // this endpoint is a simulator unless someone says otherwise.
      isSimulated: isSimulated !== false,
      createdBy: wallet,
    });

    return res.status(201).json({
      success: true,
      device,
      api_key: apiKey,
      notice: 'This key is shown once and cannot be recovered. Store it now.',
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** GET /api/devices/:farmId — devices and their health. */
const listDevices = async (req, res) => {
  try {
    const wallet = req.user?.walletAddress;
    const { farmId } = req.params;

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farm_id, farmer_wallet')
      .eq('farm_id', farmId)
      .single();

    if (!farm) return res.status(404).json({ success: false, message: 'Parcel not found' });
    if (farm.farmer_wallet !== wallet && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'That parcel is not yours' });
    }

    const health = await devices.getDeviceHealth(farmId);
    return res.json({ success: true, ...health });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** DELETE /api/devices/:deviceId — deactivate, keeping its readings. */
const deactivateDevice = async (req, res) => {
  try {
    const wallet = req.user?.walletAddress;
    const { deviceId } = req.params;

    const { data: device } = await supabaseAdmin
      .from('iot_devices')
      .select('device_id, farm_id')
      .eq('device_id', deviceId)
      .single();

    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farmer_wallet')
      .eq('farm_id', device.farm_id)
      .single();

    if (farm?.farmer_wallet !== wallet && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'That device is not yours' });
    }

    // Deactivated, never deleted. Its observations remain part of
    // the parcel's measurement history, and a carbon record that
    // can be erased by unplugging the sensor is not a record.
    await supabaseAdmin
      .from('iot_devices')
      .update({ is_active: false })
      .eq('device_id', deviceId);

    return res.json({ success: true, message: 'Device deactivated; its readings are kept' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { ingest, createDevice, listDevices, deactivateDevice, RATE_LIMIT };
