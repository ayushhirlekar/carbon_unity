const { supabaseAdmin } = require('../config/supabase');
const geometryService = require('../services/geometryService');

/**
 * GET /api/farmer/me
 * Profile plus the headline numbers the dashboard opens with.
 */
const getMe = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('wallet_address, role, display_name, phone, preferred_language, farmer_code, created_at')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    const parcels = await geometryService.listParcels(walletAddress);
    const totalHa = parcels.reduce((sum, p) => sum + (p.areaHa || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        user,
        summary: {
          parcelCount: parcels.length,
          totalArea: geometryService.inLocalUnits(totalHa),
          projectsJoined: new Set(parcels.filter(p => p.project).map(p => p.project.id)).size,
          parcelsAwaitingBaseline: parcels.filter(p => p.sampleCount < 2).length
        }
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

/**
 * GET /api/farmer/parcels
 */
const listParcels = async (req, res) => {
  try {
    const parcels = await geometryService.listParcels(req.user.walletAddress);
    return res.status(200).json({
      success: true,
      data: parcels.map(p => ({
        ...p,
        area: p.areaHa === null ? null : geometryService.inLocalUnits(p.areaHa)
      }))
    });
  } catch (error) {
    console.error('listParcels error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load parcels' });
  }
};

/**
 * POST /api/farmer/parcels/check-overlap
 * Dry run while drawing. Writes nothing.
 */
const checkOverlap = async (req, res) => {
  try {
    const { boundary } = req.body;
    const result = await geometryService.checkOverlap(boundary);

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        area: result.areaHa === null || result.areaHa === undefined
          ? null
          : geometryService.inLocalUnits(result.areaHa)
      }
    });
  } catch (error) {
    console.error('checkOverlap error:', error);
    return res.status(500).json({ success: false, message: 'Could not check this boundary' });
  }
};

/**
 * POST /api/farmer/parcels
 *
 * `area` is deliberately not read from the body. It is computed
 * from the polygon by a database trigger, which is what stops a
 * typed figure from inflating the credits a parcel can earn.
 */
const createParcel = async (req, res) => {
  try {
    const { name, boundary, ...meta } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Give this plot a name' });
    }

    const allowed = [
      'gat_number', 'hissa_number', 'village', 'taluka', 'district', 'state',
      'tenure', 'season', 'crop_type', 'previous_crop', 'cropping_system',
      'water_source', 'soil_type', 'soil_depth', 'slope',
      'tillage', 'residue_management', 'organic_inputs',
      'has_bund', 'has_trees', 'uses_fertilizer'
    ];
    const cleanMeta = {};
    for (const key of allowed) {
      if (meta[key] !== undefined && meta[key] !== '') cleanMeta[key] = meta[key];
    }

    const parcel = await geometryService.createParcel({
      farmerWallet: req.user.walletAddress,
      name: name.trim(),
      geometry: boundary,
      meta: cleanMeta
    });

    return res.status(201).json({
      success: true,
      message: 'Plot registered',
      data: { ...parcel, area: geometryService.inLocalUnits(parcel.areaHa) }
    });
  } catch (error) {
    console.error('createParcel error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to register plot'
    });
  }
};

/**
 * POST /api/farmer/parcels/:farmId/soil-card
 *
 * Transcription of a Soil Health Card. Every Indian smallholder
 * receives one, so this gives a real baseline on day one with no
 * hardware. Values are copied off the card, never recalled.
 */
const addSoilCard = async (req, res) => {
  try {
    const { farmId } = req.params;
    const {
      sampled_at, soc_percent, ph, ec, nitrogen, phosphorus, potassium,
      sulphur, zinc, boron, iron, manganese, copper, shc_reference
    } = req.body;

    if (!sampled_at) {
      return res.status(400).json({
        success: false,
        message: 'Enter the sample date printed on your card'
      });
    }
    if (!soc_percent || Number(soc_percent) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Enter the organic carbon value from your card'
      });
    }

    // Ownership check, and we need the parcel's assumed bulk
    // density and depth — the farmer cannot supply either.
    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farm_id, farmer_wallet, bulk_density, sampling_depth_cm, soil_type')
      .eq('farm_id', farmId)
      .maybeSingle();

    if (!farm) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }
    if (farm.farmer_wallet !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'This is not your plot' });
    }
    if (!farm.bulk_density) {
      return res.status(400).json({
        success: false,
        message: 'Set the soil type for this plot first — bulk density is derived from it'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('soil_samples')
      .insert([{
        farm_id: farmId,
        sampled_at,
        soc_percent: Number(soc_percent),
        bulk_density: farm.bulk_density,
        depth_cm: farm.sampling_depth_cm || 15,
        ph: ph ?? null,
        ec: ec ?? null,
        nitrogen: nitrogen ?? null,
        phosphorus: phosphorus ?? null,
        potassium: potassium ?? null,
        sulphur: sulphur ?? null,
        zinc: zinc ?? null,
        boron: boron ?? null,
        iron: iron ?? null,
        manganese: manganese ?? null,
        copper: copper ?? null,
        source: 'shc',
        shc_reference: shc_reference || null,
        verified: false
      }])
      .select()
      .single();

    if (error) {
      console.error('soil card insert error:', error);
      return res.status(500).json({ success: false, message: 'Could not save these values' });
    }

    return res.status(201).json({
      success: true,
      message: 'Soil Health Card saved',
      data: {
        sample: data,
        note: 'Bulk density and depth are assumed from your soil type, not measured.'
      }
    });
  } catch (error) {
    console.error('addSoilCard error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save card' });
  }
};

/**
 * GET /api/farmer/parcels/:farmId/samples
 */
const listSamples = async (req, res) => {
  try {
    const { farmId } = req.params;

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farmer_wallet')
      .eq('farm_id', farmId)
      .maybeSingle();

    if (!farm) return res.status(404).json({ success: false, message: 'Plot not found' });
    if (farm.farmer_wallet !== req.user.walletAddress) {
      return res.status(403).json({ success: false, message: 'This is not your plot' });
    }

    const { data, error } = await supabaseAdmin
      .from('soil_samples')
      .select('*')
      .eq('farm_id', farmId)
      .order('sampled_at', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('listSamples error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load samples' });
  }
};

module.exports = {
  getMe,
  listParcels,
  checkOverlap,
  createParcel,
  addSoilCard,
  listSamples
};
