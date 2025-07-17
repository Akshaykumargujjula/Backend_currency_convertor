const mongoose = require('mongoose');

const conversionHistorySchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  convertedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  feeType: {
    type: String,
    enum: ['none', 'bank', 'paypal', 'wise', 'western_union'],
    default: 'none'
  },
  feeAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
conversionHistorySchema.index({ userId: 1, timestamp: -1 });

// Method to format conversion for display
conversionHistorySchema.methods.formatForDisplay = function() {
  return {
    id: this._id,
    from: this.fromCurrency,
    to: this.toCurrency,
    amount: this.amount,
    rate: this.rate.toFixed(4),
    result: this.finalAmount.toFixed(2),
    timestamp: this.getRelativeTime()
  };
};

// Method to get relative time
conversionHistorySchema.methods.getRelativeTime = function() {
  const now = new Date();
  const diff = now - this.timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
};

module.exports = mongoose.model('ConversionHistory', conversionHistorySchema);
