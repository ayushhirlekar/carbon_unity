const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, adminOnly } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticate, adminOnly);

// Project CRUD
router.post('/create-project', adminController.createProject);
router.get('/projects', adminController.getProjects);
router.get('/projects/:farm_id', adminController.getProjectDetail);
router.put('/projects/:farm_id', adminController.updateProject);
router.delete('/projects/:farm_id', adminController.deleteProject);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

module.exports = router;
