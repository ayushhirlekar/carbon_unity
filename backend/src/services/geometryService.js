const { supabaseAdmin } = require('../config/supabase');

/**
 * Geometry service.
 *
 * Every spatial operation goes through a Postgres function called
 * with .rpc(). This is not a style choice: the supabase-js query
 * builder cannot emit ST_Intersects, ST_Area or ST_DWithin, and
 * PostgREST will not serialise a geometry column. Geometry only
 * ever crosses this boundary as GeoJSON text.
 */

// Smaller than this is almost certainly a mis-draw rather than a
// real plot. 0.05 ha is 500 m2, well under a guntha.
const MIN_PARCEL_HA = 0.05;

// Above this, the farmer has probably drawn a village rather than
// a field. Flagged for review rather than rejected outright.
const LARGE_PARCEL_HA = 50;

/**
 * Validate a GeoJSON geometry before it reaches the database.
 *
 * Catches the structural mistakes cheaply so Postgres only sees
 * plausible shapes. Topology (self-intersection) is still checked
 * by ST_IsValid in the overlap trigger, which is authoritative.
 */
const validateGeoJSON = (geometry) => {
  if (!geometry || typeof geometry !== 'object') {
    return { ok: false, reason: 'No boundary supplied' };
  }

  const { type, coordinates } = geometry;
  if (type !== 'Polygon' && type !== 'MultiPolygon') {
    return { ok: false, reason: `Boundary must be a Polygon, got ${type}` };
  }
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return { ok: false, reason: 'Boundary has no coordinates' };
  }

  const rings = type === 'Polygon' ? coordinates : coordinates.flat();
  const outer = rings[0];

  if (!Array.isArray(outer) || outer.length < 4) {
    return { ok: false, reason: 'A boundary needs at least three corners' };
  }

  const [fx, fy] = outer[0];
  const [lx, ly] = outer[outer.length - 1];
  if (fx !== lx || fy !== ly) {
    return { ok: false, reason: 'Boundary is not closed' };
  }

  for (const ring of rings) {
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) {
        return { ok: false, reason: 'Malformed coordinate in boundary' };
      }
      const [lon, lat] = pt;
      if (typeof lon !== 'number' || typeof lat !== 'number' ||
          Number.isNaN(lon) || Number.isNaN(lat)) {
        return { ok: false, reason: 'Non-numeric coordinate in boundary' };
      }
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        return { ok: false, reason: 'Coordinate is outside the world' };
      }
    }
  }

  return { ok: true };
};

/**
 * Dry-run overlap check. Writes nothing.
 *
 * Called while the farmer is still drawing so a conflict appears
 * before they submit rather than after.
 */
const checkOverlap = async (geometry) => {
  const valid = validateGeoJSON(geometry);
  if (!valid.ok) return { verdict: 'invalid_shape', reason: valid.reason };

  const { data, error } = await supabaseAdmin
    .rpc('fn_check_overlap', { p_geojson: JSON.stringify(geometry) });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { verdict: 'clear', areaHa: null };

  return {
    verdict: row.verdict,
    areaHa: row.area_ha === null ? null : Number(row.area_ha),
    conflictFarmId: row.conflict_farm_id,
    conflictName: row.conflict_name,
    intersectionRatio: row.intersection_ratio === null ? null : Number(row.intersection_ratio),
    sizeWarning: sizeWarningFor(row.area_ha)
  };
};

const sizeWarningFor = (areaHa) => {
  const a = Number(areaHa);
  if (!a || Number.isNaN(a)) return null;
  if (a < MIN_PARCEL_HA) return 'This looks too small to be a field. Check the outline.';
  if (a > LARGE_PARCEL_HA) return 'This is unusually large for a smallholding. Please confirm.';
  return null;
};

/**
 * Create a parcel. Area is never accepted from the caller — it is
 * computed from the polygon by a database trigger.
 */
const createParcel = async ({ farmerWallet, name, geometry, meta = {} }) => {
  const valid = validateGeoJSON(geometry);
  if (!valid.ok) {
    const err = new Error(valid.reason);
    err.statusCode = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin.rpc('fn_create_parcel', {
    p_farmer_wallet: farmerWallet,
    p_name: name,
    p_geojson: JSON.stringify(geometry),
    p_meta: meta
  });

  if (error) {
    // The overlap and validity triggers raise here. Their messages
    // are already written for a farmer to read, so they are passed
    // through rather than replaced with something generic.
    const err = new Error(error.message);
    err.statusCode = /overlaps|not a valid shape/i.test(error.message) ? 409 : 500;
    throw err;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    farmId: row.farm_id,
    areaHa: Number(row.area_ha),
    overlapStatus: row.overlap_status,
    centroid: { lon: row.centroid_lon, lat: row.centroid_lat },
    geometryHash: row.geometry_hash
  };
};

/**
 * All parcels for a farmer, boundaries included as GeoJSON.
 */
const listParcels = async (walletAddress) => {
  const { data, error } = await supabaseAdmin
    .rpc('fn_farmer_parcels', { p_wallet: walletAddress });

  if (error) throw error;

  return (data || []).map((r) => ({
    farmId: r.farm_id,
    name: r.name,
    areaHa: r.area_ha === null ? null : Number(r.area_ha),
    village: r.village,
    taluka: r.taluka,
    gatNumber: r.gat_number,
    hissaNumber: r.hissa_number,
    soilType: r.soil_type,
    waterSource: r.water_source,
    cropType: r.crop_type,
    overlapStatus: r.overlap_status,
    boundary: r.boundary_json ? JSON.parse(r.boundary_json) : null,
    centroid: r.centroid_lon === null ? null : { lon: r.centroid_lon, lat: r.centroid_lat },
    project: r.project_id ? { id: r.project_id, name: r.project_name } : null,
    sampleCount: Number(r.sample_count || 0),
    latestSoc: r.latest_soc === null ? null : Number(r.latest_soc)
  }));
};

/**
 * Convert hectares into the units a Maharashtra farmer thinks in.
 *
 * This matters for verification, not decoration: if the drawn area
 * and the farmer's own sense of their plot disagree, the boundary
 * is wrong — and they will only notice in acres or guntha.
 */
const inLocalUnits = (areaHa) => {
  const acres = areaHa * 2.47105;
  return {
    hectares: Number(areaHa.toFixed(4)),
    acres: Number(acres.toFixed(2)),
    guntha: Number((acres * 40).toFixed(0))
  };
};

module.exports = {
  validateGeoJSON,
  checkOverlap,
  createParcel,
  listParcels,
  inLocalUnits,
  MIN_PARCEL_HA,
  LARGE_PARCEL_HA
};
