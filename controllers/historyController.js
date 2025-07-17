const ConversionHistory = require('../models/ConversionHistory');

exports.getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { userId: req.user._id };
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get history with pagination
    const history = await ConversionHistory.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const totalCount = await ConversionHistory.countDocuments(query);
    
    // Format history for display
    const formattedHistory = history.map(item => ({
      id: item._id,
      from: item.fromCurrency,
      to: item.toCurrency,
      amount: item.amount,
      rate: item.rate.toFixed(4),
      result: item.finalAmount.toFixed(2),
      timestamp: formatRelativeTime(item.timestamp),
      feeType: item.feeType,
      feeAmount: item.feeAmount.toFixed(2)
    }));
    
    res.json({
      history: formattedHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasMore: skip + history.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    res.status(500).json({ error: 'Internal server error fetching history' });
  }
};

exports.addToHistory = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount, rate, convertedAmount, feeType, feeAmount, finalAmount } = req.body;
    
    // Input validation
    if (!fromCurrency || !toCurrency || !amount || !rate || !finalAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const historyEntry = new ConversionHistory({
      userId: req.user._id,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      amount: parseFloat(amount),
      rate: parseFloat(rate),
      convertedAmount: parseFloat(convertedAmount),
      feeType: feeType || 'none',
      feeAmount: parseFloat(feeAmount) || 0,
      finalAmount: parseFloat(finalAmount)
    });
    
    await historyEntry.save();
    
    res.json({
      message: 'Conversion added to history',
      historyId: historyEntry._id
    });
    
  } catch (error) {
    console.error('Error adding to history:', error);
    res.status(500).json({ error: 'Internal server error adding to history' });
  }
};

exports.deleteFromHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and delete the history entry
    const historyEntry = await ConversionHistory.findOneAndDelete({
      _id: id,
      userId: req.user._id // Ensure user can only delete their own history
    });
    
    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    
    res.json({ message: 'History entry deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting from history:', error);
    res.status(500).json({ error: 'Internal server error deleting from history' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const result = await ConversionHistory.deleteMany({ userId: req.user._id });
    
    res.json({ 
      message: 'History cleared successfully',
      deletedCount: result.deletedCount 
    });
    
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Internal server error clearing history' });
  }
};

exports.getHistoryStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get total conversions
    const totalConversions = await ConversionHistory.countDocuments({ userId });
    
    // Get most used currency pairs
    const topPairs = await ConversionHistory.aggregate([
      { $match: { userId } },
      { 
        $group: {
          _id: { from: '$fromCurrency', to: '$toCurrency' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get conversion volume by month
    const monthlyVolume = await ConversionHistory.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);
    
    res.json({
      totalConversions,
      topPairs: topPairs.map(pair => ({
        from: pair._id.from,
        to: pair._id.to,
        count: pair.count,
        totalAmount: pair.totalAmount.toFixed(2)
      })),
      monthlyVolume: monthlyVolume.map(month => ({
        year: month._id.year,
        month: month._id.month,
        count: month.count,
        totalAmount: month.totalAmount.toFixed(2)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching history stats:', error);
    res.status(500).json({ error: 'Internal server error fetching history stats' });
  }
};

// Helper function to format relative time
function formatRelativeTime(timestamp) {
  const now = new Date();
  const diff = now - timestamp;
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
}
