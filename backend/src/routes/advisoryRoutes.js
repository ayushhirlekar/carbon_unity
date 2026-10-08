const express = require('express');
const router = express.Router();
const c = require('../controllers/advisoryController');
const { authenticate } = require('../middleware/auth');

// The evidence base itself is public — a buyer should be able to
// read what the advice rests on without an account.
router.get('/evidence', c.listEvidence);

router.use(authenticate);
router.post('/assess/:farmId', c.runAssessment);
router.get('/:farmId/latest', c.latestAssessment);

module.exports = router;
