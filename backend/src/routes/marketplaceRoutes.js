const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { authenticate, buyerOnly } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/listings', marketplaceController.getListings);
router.get('/listings/:id', marketplaceController.getListingDetail);

// Buyer-only routes (auth required)
router.post('/purchase', authenticate, buyerOnly, marketplaceController.purchaseCredits);
router.get('/purchases', authenticate, buyerOnly, marketplaceController.getPurchaseHistory);
router.get('/buyer/dashboard', authenticate, buyerOnly, marketplaceController.getBuyerDashboard);

module.exports = router;