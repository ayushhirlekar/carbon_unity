/**
 * CarbonUnity v2 — Carbon Credit Calculation Service
 *
 * Formula (from PROJECT_CONTEXT.md):
 *   Carbon Stock (tons) = SOC (%) × Bulk Density (g/cm³) × Depth (cm) × Area (hectares) × 100
 *   CO2 Equivalent (tons) = Carbon Stock × 3.67
 *   Credits = CO2 Equivalent (1 credit = 1 ton CO2e)
 */

/**
 * Calculate carbon credits from soil data
 * @param {number} soc - Soil Organic Carbon (%)
 * @param {number} bulkDensity - Bulk Density (g/cm³)
 * @param {number} depth - Soil Depth (cm)
 * @param {number} area - Farm Area (hectares)
 * @returns {object} { carbonStock, co2Equivalent, creditsGenerated }
 */
const calculateCarbon = (soc, bulkDensity, depth, area) => {
  if (soc <= 0 || bulkDensity <= 0 || depth <= 0 || area <= 0) {
    throw new Error('All input values must be positive numbers');
  }

  // Carbon Stock = SOC% × Bulk Density × Depth(cm) × Area(ha) × 100
  // The ×100 converts the percentage and unit alignment
  const carbonStock = (soc / 100) * bulkDensity * depth * area * 100;

  // CO2 Equivalent = Carbon Stock × 3.67 (molecular weight ratio CO2/C)
  const co2Equivalent = carbonStock * 3.67;

  // 1 credit = 1 ton CO2e
  const creditsGenerated = Math.round(co2Equivalent * 100) / 100;

  return {
    carbonStock: Math.round(carbonStock * 10000) / 10000,
    co2Equivalent: Math.round(co2Equivalent * 10000) / 10000,
    creditsGenerated
  };
};

/**
 * Validate soil measurement inputs
 * @param {object} data - { soc, bulkDensity, depth, area }
 * @returns {object} { isValid, errors[] }
 */
const validateSoilData = (data) => {
  const errors = [];

  // SOC: typical range 0.5% - 15%
  if (!data.soc || data.soc <= 0) {
    errors.push('SOC must be a positive number');
  } else if (data.soc > 20) {
    errors.push('SOC value seems unusually high (> 20%)');
  }

  // Bulk Density: typical range 0.8 - 2.0 g/cm³
  if (!data.bulkDensity || data.bulkDensity <= 0) {
    errors.push('Bulk Density must be a positive number');
  } else if (data.bulkDensity < 0.5 || data.bulkDensity > 2.5) {
    errors.push('Bulk Density outside typical range (0.5 - 2.5 g/cm³)');
  }

  // Depth in cm: typical range 10 - 200 cm
  if (!data.depth || data.depth <= 0) {
    errors.push('Depth must be a positive number');
  } else if (data.depth > 300) {
    errors.push('Depth seems unusually high (> 300 cm)');
  }

  // Area: must be positive
  if (!data.area || data.area <= 0) {
    errors.push('Area must be a positive number (hectares)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = { calculateCarbon, validateSoilData };