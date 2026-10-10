const express = require('express');
const router = express.Router();
const c = require('../controllers/demoController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/scenarios', c.scenarios);
router.post('/:farmId/start', c.start);
router.get('/:farmId/run/:runId', c.status);
router.post('/:farmId/run/:runId/stop', c.stop);
router.post('/:farmId/clear', c.clear);
router.post('/:farmId/interpret', c.interpret);

module.exports = router;
