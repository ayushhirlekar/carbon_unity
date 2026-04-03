/**
 * CarbonUnity v2 — Admin Controller
 *
 * Handles all admin operations:
 * - Atomic project creation (farm + carbon_data + listing in one transaction)
 * - Project listing, detail, update, delete
 */

const { supabaseAdmin } = require('../config/supabase');
const { calculateCarbon, validateSoilData } = require('../services/carbonCalculation');

/**
 * POST /api/admin/create-project
 * Atomic: Creates farm + carbon_data + marketplace_listing
 */
const createProject = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    const {
      // Farm data
      farmName,
      location,
      district,
      state,
      area,
      cropType,
      farmerName,
      farmerContact,
      numberOfFarmers,
      // Soil / carbon data
      soc,
      bulkDensity,
      depth,
      // Listing data
      title,
      subtitle,
      coverImageUrl,
      pricePerCredit,
      vintageYear,
      verificationStandard,
      practiceTags,
      listingStatus
    } = req.body;

    // ── Validate required fields ──
    const missing = [];
    if (!farmName) missing.push('farmName');
    if (!location) missing.push('location');
    if (!area) missing.push('area');
    if (!soc) missing.push('soc');
    if (!bulkDensity) missing.push('bulkDensity');
    if (!depth) missing.push('depth');
    if (!title) missing.push('title');
    if (!pricePerCredit) missing.push('pricePerCredit');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // ── Validate soil data ──
    const soilValidation = validateSoilData({ soc, bulkDensity, depth, area });
    if (!soilValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid soil data',
        errors: soilValidation.errors
      });
    }

    // ── Calculate carbon credits ──
    const calculation = calculateCarbon(
      parseFloat(soc),
      parseFloat(bulkDensity),
      parseFloat(depth),
      parseFloat(area)
    );

    // ── Step 1: Insert farm ──
    const { data: farm, error: farmError } = await supabaseAdmin
      .from('farms')
      .insert([{
        name: farmName,
        location,
        district: district || null,
        state: state || null,
        area: parseFloat(area),
        crop_type: cropType || null,
        farmer_name: farmerName || null,
        farmer_contact: farmerContact || null,
        number_of_farmers: numberOfFarmers ? parseInt(numberOfFarmers) : 1,
        is_verified: false,
        created_by: walletAddress
      }])
      .select()
      .single();

    if (farmError) {
      console.error('Farm insert error:', farmError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create farm record',
        error: farmError.message
      });
    }

    // ── Step 2: Insert carbon data ──
    const { data: carbonData, error: carbonError } = await supabaseAdmin
      .from('carbon_data')
      .insert([{
        farm_id: farm.farm_id,
        soc: parseFloat(soc),
        bulk_density: parseFloat(bulkDensity),
        depth: parseFloat(depth),
        carbon_stock: calculation.carbonStock,
        co2_equivalent: calculation.co2Equivalent,
        credits_generated: calculation.creditsGenerated,
        verified: false,
        admin_notes: null
      }])
      .select()
      .single();

    if (carbonError) {
      console.error('Carbon data insert error:', carbonError);
      // Rollback: delete the farm we just created
      await supabaseAdmin.from('farms').delete().eq('farm_id', farm.farm_id);
      return res.status(500).json({
        success: false,
        message: 'Failed to create carbon data. Farm creation rolled back.',
        error: carbonError.message
      });
    }

    // ── Step 3: Insert marketplace listing ──
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('marketplace_listings')
      .insert([{
        farm_id: farm.farm_id,
        title,
        subtitle: subtitle || null,
        location: location,
        cover_image_url: coverImageUrl || null,
        credits_available: calculation.creditsGenerated,
        price_per_credit: parseFloat(pricePerCredit),
        vintage_year: vintageYear ? parseInt(vintageYear) : new Date().getFullYear(),
        verification_standard: verificationStandard || null,
        practice_tags: practiceTags || [],
        status: listingStatus || 'draft',
        created_by: walletAddress
      }])
      .select()
      .single();

    if (listingError) {
      console.error('Listing insert error:', listingError);
      // Rollback: delete carbon_data and farm (cascade will handle carbon_data)
      await supabaseAdmin.from('farms').delete().eq('farm_id', farm.farm_id);
      return res.status(500).json({
        success: false,
        message: 'Failed to create listing. Project creation rolled back.',
        error: listingError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        farm,
        carbonData,
        listing,
        calculation
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
};

/**
 * GET /api/admin/projects
 * List all projects created by admin
 */
const getProjects = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    const { data: farms, error } = await supabaseAdmin
      .from('farms')
      .select(`
        *,
        carbon_data (*),
        marketplace_listings (*)
      `)
      .eq('created_by', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get projects error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch projects'
      });
    }

    return res.status(200).json({
      success: true,
      data: farms,
      count: farms.length
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch projects'
    });
  }
};

/**
 * GET /api/admin/projects/:farm_id
 * Get single project detail
 */
const getProjectDetail = async (req, res) => {
  try {
    const { farm_id } = req.params;
    const { walletAddress } = req.user;

    const { data: farm, error } = await supabaseAdmin
      .from('farms')
      .select(`
        *,
        carbon_data (*),
        marketplace_listings (
          *,
          transactions (*)
        )
      `)
      .eq('farm_id', farm_id)
      .eq('created_by', walletAddress)
      .maybeSingle();

    if (error || !farm) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: farm
    });
  } catch (error) {
    console.error('Get project detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch project detail'
    });
  }
};

/**
 * PUT /api/admin/projects/:farm_id
 * Update farm, carbon data, and/or listing
 */
const updateProject = async (req, res) => {
  try {
    const { farm_id } = req.params;
    const { walletAddress } = req.user;
    const updates = req.body;

    // Verify ownership
    const { data: existingFarm } = await supabaseAdmin
      .from('farms')
      .select('farm_id')
      .eq('farm_id', farm_id)
      .eq('created_by', walletAddress)
      .maybeSingle();

    if (!existingFarm) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not owned by you'
      });
    }

    const results = {};

    // Update farm fields if provided
    if (updates.farm) {
      const { data: updatedFarm, error } = await supabaseAdmin
        .from('farms')
        .update(updates.farm)
        .eq('farm_id', farm_id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update farm data',
          error: error.message
        });
      }
      results.farm = updatedFarm;
    }

    // Update carbon data if provided
    if (updates.carbonData) {
      const { data: updatedCarbon, error } = await supabaseAdmin
        .from('carbon_data')
        .update(updates.carbonData)
        .eq('farm_id', farm_id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update carbon data',
          error: error.message
        });
      }
      results.carbonData = updatedCarbon;
    }

    // Update listing if provided
    if (updates.listing) {
      const { data: updatedListing, error } = await supabaseAdmin
        .from('marketplace_listings')
        .update(updates.listing)
        .eq('farm_id', farm_id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update listing',
          error: error.message
        });
      }
      results.listing = updatedListing;
    }

    // Recalculate if soil data changed
    if (updates.recalculate && updates.carbonData) {
      const farm = results.farm || (await supabaseAdmin
        .from('farms')
        .select('area')
        .eq('farm_id', farm_id)
        .single()).data;

      const cd = updates.carbonData;
      if (cd.soc && cd.bulk_density && cd.depth && farm) {
        const calc = calculateCarbon(cd.soc, cd.bulk_density, cd.depth, farm.area);
        await supabaseAdmin
          .from('carbon_data')
          .update({
            carbon_stock: calc.carbonStock,
            co2_equivalent: calc.co2Equivalent,
            credits_generated: calc.creditsGenerated
          })
          .eq('farm_id', farm_id);

        results.recalculation = calc;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: results
    });
  } catch (error) {
    console.error('Update project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update project'
    });
  }
};

/**
 * DELETE /api/admin/projects/:farm_id
 * Delete project (cascades to carbon_data and listings)
 */
const deleteProject = async (req, res) => {
  try {
    const { farm_id } = req.params;
    const { walletAddress } = req.user;

    // Verify ownership
    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('farm_id')
      .eq('farm_id', farm_id)
      .eq('created_by', walletAddress)
      .maybeSingle();

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not owned by you'
      });
    }

    // Check for confirmed transactions (prevent deleting sold projects)
    const { data: txns } = await supabaseAdmin
      .from('transactions')
      .select('transaction_id, marketplace_listings!inner(farm_id)')
      .eq('marketplace_listings.farm_id', farm_id)
      .eq('status', 'confirmed');

    if (txns && txns.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete project with confirmed transactions'
      });
    }

    // Delete (cascades to carbon_data and listings)
    const { error } = await supabaseAdmin
      .from('farms')
      .delete()
      .eq('farm_id', farm_id);

    if (error) {
      console.error('Delete project error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete project'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete project'
    });
  }
};

/**
 * GET /api/admin/dashboard
 * Admin dashboard statistics
 */
const getDashboard = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    // Total projects
    const { count: totalProjects } = await supabaseAdmin
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', walletAddress);

    // Active listings
    const { count: activeListings } = await supabaseAdmin
      .from('marketplace_listings')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', walletAddress)
      .eq('status', 'active');

    // Total credits generated
    const { data: carbonRecords } = await supabaseAdmin
      .from('carbon_data')
      .select('credits_generated, farms!inner(created_by)')
      .eq('farms.created_by', walletAddress);

    const totalCredits = carbonRecords
      ? carbonRecords.reduce((sum, r) => sum + parseFloat(r.credits_generated || 0), 0)
      : 0;

    // Total transactions
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('price_paid, credits_purchased, marketplace_listings!inner(created_by)')
      .eq('marketplace_listings.created_by', walletAddress)
      .eq('status', 'confirmed');

    const totalRevenue = transactions
      ? transactions.reduce((sum, t) => sum + parseFloat(t.price_paid || 0), 0)
      : 0;

    const totalSold = transactions
      ? transactions.reduce((sum, t) => sum + parseFloat(t.credits_purchased || 0), 0)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalProjects: totalProjects || 0,
        activeListings: activeListings || 0,
        totalCreditsGenerated: Math.round(totalCredits * 100) / 100,
        totalCreditsSold: Math.round(totalSold * 100) / 100,
        totalRevenue: totalRevenue.toFixed(6)
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectDetail,
  updateProject,
  deleteProject,
  getDashboard
};
