const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy for email/password authentication
passport.use(new LocalStrategy(
  {
    usernameField: 'email', // Use email instead of username
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        // User exists, return the user
        return done(null, user);
      }

      // Check if user exists with the same email
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // User exists with same email, link the Google account
        user.googleId = profile.id;
        user.avatar = profile.photos[0].value;
        await user.save();
        return done(null, user);
      }

      // Create new user
      user = new User({
        googleId: profile.id,
        username: profile.displayName.toLowerCase().replace(/\s+/g, '_'),
        email: profile.emails[0].value,
        avatar: profile.photos[0].value
      });

      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

module.exports = passport;
