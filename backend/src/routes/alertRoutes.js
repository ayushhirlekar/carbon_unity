const express = require('express');
const router = express.Router();
const c = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.post('/run', c.run);
router.post('/:alertId/read', c.markRead);

module.exports = router;
