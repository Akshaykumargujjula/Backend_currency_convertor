const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated, isNotAuthenticated, getCurrentUser } = require('../middleware/auth');

// User registration
router.post('/signup', isNotAuthenticated, authController.register);

// User login
router.post('/login', isNotAuthenticated, authController.login);

// User logout
router.post('/logout', isAuthenticated, authController.logout);

// Get current user info
router.get('/user', getCurrentUser, authController.getCurrentUser);

// Google OAuth routes
router.get('/google', authController.googleAuth);

router.get('/google/callback', authController.googleAuthCallback);

module.exports = router;
