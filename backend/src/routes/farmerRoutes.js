const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');
const { authenticate, farmerOnly } = require('../middleware/auth');

// Everything here is the farmer's own data.
router.use(authenticate, farmerOnly);

router.get('/me', farmerController.getMe);

router.get('/parcels', farmerController.listParcels);
router.post('/parcels', farmerController.createParcel);

// Dry run while drawing — must be declared before any ':farmId'
// route, or Express would match 'check-overlap' as a farm id.
router.post('/parcels/check-overlap', farmerController.checkOverlap);

router.get('/parcels/:farmId/samples', farmerController.listSamples);
router.post('/parcels/:farmId/soil-card', farmerController.addSoilCard);

module.exports = router;
