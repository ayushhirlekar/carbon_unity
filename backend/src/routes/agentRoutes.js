const express = require('express');
const router = express.Router();
const c = require('../controllers/agentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/chat', c.chat);
router.get('/conversations/:farmId', c.history);

module.exports = router;
