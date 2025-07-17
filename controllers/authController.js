const User = require('../models/User');
const passport = require('passport');

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    req.login(user, (err) => {
      if (err) {
        console.error('Error logging in user after registration:', err);
        return res.status(500).json({ error: 'Error logging in after registration' });
      }
      res.json(user);
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      res.json(user);
    });
  })(req, res, next);
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ message: 'Logout successful' });
  });
};

exports.getCurrentUser = (req, res) => {
  if (req.currentUser) {
    return res.json(req.currentUser);
  }
  res.status(404).json({ error: 'No user is currently logged in' });
};

exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleAuthCallback = passport.authenticate('google', {
  successRedirect: process.env.FRONTEND_URL || '/dashboard',
  failureRedirect: '/login'
});

