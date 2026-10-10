const express = require('express');
const router = express.Router();
const c = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/run', c.runAll);                    // admin, all parcels
router.get('/:farmId/latest', c.latest);
router.get('/:farmId', c.history);
router.post('/:farmId/generate', c.generate);     // "Generate report now"

module.exports = router;
