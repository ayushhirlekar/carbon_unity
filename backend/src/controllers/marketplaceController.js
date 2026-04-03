/**
 * CarbonUnity v2 — Marketplace Controller
 *
 * Public listings (no auth), buyer purchase with blockchain verification
 */

const { supabaseAdmin } = require('../config/supabase');
const { verifyTransaction, isTransactionRecorded } = require('../services/blockchainService');

/**
 * GET /api/marketplace/listings
 * Public — no authentication required
 * Returns all active listings with farm and carbon data
 */
const getListings = async (req, res) => {
  try {
    const { data: listings, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select(`
        *,
        farms (
          name,
          location,
          district,
          state,
          area,
          crop_type,
          farmer_name,
          is_verified
        ),
        carbon_data:farms (
          carbon_data (
            credits_generated,
            co2_equivalent,
            verified
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get listings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch listings'
      });
    }

    return res.status(200).json({
      success: true,
      data: listings,
      count: listings.length
    });
  } catch (error) {
    console.error('Get listings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch listings'
    });
  }
};

/**
 * GET /api/marketplace/listings/:id
 * Public — full project detail for a listing
 */
const getListingDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabaseAdmin
      .from('marketplace_listings')
      .select(`
        *,
        farms (
          *,
          carbon_data (*)
        )
      `)
      .eq('listing_id', id)
      .maybeSingle();

    if (error || !listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Get listing detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch listing detail'
    });
  }
};

/**
 * POST /api/marketplace/purchase
 * Buyer purchases credits — requires auth + blockchain tx verification
 */
const purchaseCredits = async (req, res) => {
  try {
    const { walletAddress } = req.user;
    const { listingId, blockchainTxHash, creditsPurchased } = req.body;

    // ── Validate input ──
    if (!listingId || !blockchainTxHash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: listingId, blockchainTxHash'
      });
    }

    // ── Check idempotency (prevent double-spend) ──
    const alreadyRecorded = await isTransactionRecorded(supabaseAdmin, blockchainTxHash);
    if (alreadyRecorded) {
      return res.status(409).json({
        success: false,
        message: 'Transaction hash already recorded. Duplicate submission prevented.'
      });
    }

    // ── Get listing ──
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('marketplace_listings')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Listing is not active (current status: ${listing.status})`
      });
    }

    // Determine credits to purchase
    const credits = creditsPurchased
      ? parseFloat(creditsPurchased)
      : parseFloat(listing.credits_available);

    if (credits <= 0 || credits > parseFloat(listing.credits_available)) {
      return res.status(400).json({
        success: false,
        message: `Invalid credits amount. Available: ${listing.credits_available}`
      });
    }

    const expectedPrice = credits * parseFloat(listing.price_per_credit);

    // ── Verify blockchain transaction ──
    let txVerification;
    try {
      txVerification = await verifyTransaction(blockchainTxHash, {
        buyerWallet: walletAddress
      });
    } catch (verifyError) {
      console.error('Blockchain verification failed:', verifyError);
      return res.status(400).json({
        success: false,
        message: `Blockchain verification failed: ${verifyError.message}`
      });
    }

    // Verify payment amount (allow 1% tolerance for gas estimation differences)
    const paidAmount = parseFloat(txVerification.value);
    const tolerance = expectedPrice * 0.01;
    if (Math.abs(paidAmount - expectedPrice) > tolerance && paidAmount < expectedPrice) {
      return res.status(400).json({
        success: false,
        message: `Insufficient payment. Expected: ${expectedPrice.toFixed(8)} ETH, Received: ${paidAmount.toFixed(8)} ETH`
      });
    }

    // ── Record transaction ──
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        listing_id: listingId,
        buyer_wallet: walletAddress,
        credits_purchased: credits,
        price_paid: paidAmount,
        blockchain_tx_hash: blockchainTxHash.toLowerCase(),
        status: 'confirmed',
        block_number: txVerification.blockNumber
      }])
      .select()
      .single();

    if (txError) {
      console.error('Transaction record error:', txError);
      return res.status(500).json({
        success: false,
        message: 'Failed to record transaction'
      });
    }

    // ── Update listing credits ──
    const remainingCredits = parseFloat(listing.credits_available) - credits;
    const newStatus = remainingCredits <= 0 ? 'sold' : 'active';

    await supabaseAdmin
      .from('marketplace_listings')
      .update({
        credits_available: Math.max(0, remainingCredits),
        status: newStatus
      })
      .eq('listing_id', listingId);

    return res.status(200).json({
      success: true,
      message: 'Purchase completed successfully',
      data: {
        transaction,
        creditsReceived: credits,
        amountPaid: paidAmount,
        remainingCredits: Math.max(0, remainingCredits),
        listingStatus: newStatus,
        blockNumber: txVerification.blockNumber
      }
    });
  } catch (error) {
    console.error('Purchase credits error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to purchase credits'
    });
  }
};

/**
 * GET /api/marketplace/purchases
 * Get buyer's purchase history (auth required)
 */
const getPurchaseHistory = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    const { data: transactions, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        *,
        marketplace_listings (
          title,
          location,
          cover_image_url,
          price_per_credit,
          farm_id,
          farms (name, location)
        )
      `)
      .eq('buyer_wallet', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get purchase history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase history'
      });
    }

    return res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get purchase history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase history'
    });
  }
};

/**
 * GET /api/marketplace/buyer/dashboard
 * Buyer dashboard summary (auth required)
 */
const getBuyerDashboard = async (req, res) => {
  try {
    const { walletAddress } = req.user;

    // Total purchases count
    const { count: totalPurchases } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_wallet', walletAddress)
      .eq('status', 'confirmed');

    // Get totals
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('price_paid, credits_purchased')
      .eq('buyer_wallet', walletAddress)
      .eq('status', 'confirmed');

    const totalEthSpent = transactions
      ? transactions.reduce((sum, tx) => sum + parseFloat(tx.price_paid || 0), 0)
      : 0;

    const totalCreditsOwned = transactions
      ? transactions.reduce((sum, tx) => sum + parseFloat(tx.credits_purchased || 0), 0)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalPurchases: totalPurchases || 0,
        totalCreditsOwned: Math.round(totalCreditsOwned * 100) / 100,
        totalEthSpent: totalEthSpent.toFixed(6)
      }
    });
  } catch (error) {
    console.error('Get buyer dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
};

module.exports = {
  getListings,
  getListingDetail,
  purchaseCredits,
  getPurchaseHistory,
  getBuyerDashboard
};