const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');

// Get dashboard statistics and data
router.get('/stats', isAuthenticated, dashboardController.getDashboardStats);

// Get forex news
router.get('/news', dashboardController.getForexNews);

module.exports = router;
