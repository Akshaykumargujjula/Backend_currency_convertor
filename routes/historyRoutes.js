const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { isAuthenticated } = require('../middleware/auth');

// Get user's conversion history
router.get('/', isAuthenticated, historyController.getHistory);

// Add conversion to history
router.post('/', isAuthenticated, historyController.addToHistory);

// Delete specific conversion from history
router.delete('/:id', isAuthenticated, historyController.deleteFromHistory);

// Clear all conversion history
router.delete('/', isAuthenticated, historyController.clearHistory);

// Get history statistics
router.get('/stats', isAuthenticated, historyController.getHistoryStats);

module.exports = router;
