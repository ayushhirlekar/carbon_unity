const express = require('express');
const router = express.Router();
const c = require('../controllers/ingestController');
const { authenticate } = require('../middleware/auth');

/**
 * Two different kinds of caller live here, so the middleware is
 * applied per route rather than with router.use().
 *
 * /ingest is a device: it authenticates with x-device-key and has
 * no wallet, so wallet authentication must NOT run on it.
 * Everything else is a person managing their devices.
 */

// Device → server. Authenticated inside the controller by key.
router.post('/ingest', c.ingest);

// Person → server.
router.post('/devices', authenticate, c.createDevice);
router.get('/devices/:farmId', authenticate, c.listDevices);
router.delete('/devices/:deviceId', authenticate, c.deactivateDevice);

module.exports = router;
