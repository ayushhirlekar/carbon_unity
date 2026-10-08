const express = require('express');
const router = express.Router();
const c = require('../controllers/sensingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/refresh', c.refreshAll);
router.post('/refresh/:farmId', c.refreshOne);
router.get('/status/:farmId', c.status);

module.exports = router;
