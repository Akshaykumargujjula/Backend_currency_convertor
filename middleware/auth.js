// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ 
    error: 'Unauthorized', 
    message: 'Please log in to access this resource' 
  });
};

// Middleware to check if user is not authenticated (for login/signup routes)
const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  return res.status(400).json({ 
    error: 'Already authenticated', 
    message: 'You are already logged in' 
  });
};

// Middleware to get current user info
const getCurrentUser = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.currentUser = req.user;
  }
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  getCurrentUser
};
