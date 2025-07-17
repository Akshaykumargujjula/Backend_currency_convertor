const mongoose = require('mongoose');

const bookmarkedPairsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  currentRate: {
    type: Number,
    required: true,
    min: 0
  },
  trend: {
    type: String,
    enum: ['up', 'down', 'neutral'],
    default: 'neutral'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate bookmarks for same user
bookmarkedPairsSchema.index({ userId: 1, fromCurrency: 1, toCurrency: 1 }, { unique: true });

// Index for faster queries
bookmarkedPairsSchema.index({ userId: 1, updatedAt: -1 });

// Update the updatedAt field before saving
bookmarkedPairsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to format bookmark for display
bookmarkedPairsSchema.methods.formatForDisplay = function() {
  return {
    id: this._id,
    from: this.fromCurrency,
    to: this.toCurrency,
    rate: this.currentRate.toFixed(4),
    trend: this.trend
  };
};

// Static method to check if bookmark exists
bookmarkedPairsSchema.statics.bookmarkExists = async function(userId, fromCurrency, toCurrency) {
  const bookmark = await this.findOne({
    userId,
    fromCurrency: fromCurrency.toUpperCase(),
    toCurrency: toCurrency.toUpperCase()
  });
  return !!bookmark;
};

// Method to update rate and trend
bookmarkedPairsSchema.methods.updateRate = async function(newRate) {
  const oldRate = this.currentRate;
  this.currentRate = newRate;
  
  // Determine trend based on rate change
  if (newRate > oldRate) {
    this.trend = 'up';
  } else if (newRate < oldRate) {
    this.trend = 'down';
  } else {
    this.trend = 'neutral';
  }
  
  return await this.save();
};

module.exports = mongoose.model('BookmarkedPairs', bookmarkedPairsSchema);
