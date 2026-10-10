const express = require('express');
const router = express.Router();
const c = require('../controllers/mlController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/soc/info', c.info);
router.post('/soc/start', c.start);
router.get('/soc/run/:runId', c.status);
router.post('/soc/run/:runId/stop', c.stop);

module.exports = router;
