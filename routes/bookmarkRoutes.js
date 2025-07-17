const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmarkController');
const { isAuthenticated } = require('../middleware/auth');

// Get user's bookmarked currency pairs
router.get('/', isAuthenticated, bookmarkController.getBookmarks);

// Add currency pair to bookmarks
router.post('/', isAuthenticated, bookmarkController.addBookmark);

// Remove bookmark
router.delete('/:id', isAuthenticated, bookmarkController.removeBookmark);

// Update specific bookmark rate
router.put('/:id/rate', isAuthenticated, bookmarkController.updateBookmarkRate);

// Update all bookmark rates
router.put('/rates/update-all', isAuthenticated, bookmarkController.updateAllBookmarkRates);

// Check if currency pair is bookmarked
router.get('/check', isAuthenticated, bookmarkController.checkBookmarkExists);

module.exports = router;
