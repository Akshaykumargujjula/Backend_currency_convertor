const ConversionHistory = require('../models/ConversionHistory');
const BookmarkedPairs = require('../models/BookmarkedPairs');
const { getLiveExchangeRate, getMockExchangeRate } = require('../utils/exchangeRateAPI');

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get recent conversion history (last 4 entries)
    const recentHistory = await ConversionHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(4)
      .lean();
    
    // Get bookmarked pairs with updated rates
    const bookmarks = await BookmarkedPairs.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
    
    // Update bookmark rates if they're older than 1 hour
    const updatedBookmarks = [];
    for (const bookmark of bookmarks) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (bookmark.updatedAt < hourAgo) {
        try {
          let newRate;
          try {
            const rateData = await getLiveExchangeRate(bookmark.fromCurrency, bookmark.toCurrency);
            newRate = rateData.rate;
          } catch (error) {
            console.warn(`Using mock rate for ${bookmark.fromCurrency}-${bookmark.toCurrency}:`, error.message);
            newRate = getMockExchangeRate(bookmark.fromCurrency, bookmark.toCurrency);
          }
          
          const bookmarkDoc = await BookmarkedPairs.findById(bookmark._id);
          await bookmarkDoc.updateRate(newRate);
          
          updatedBookmarks.push({
            id: bookmarkDoc._id,
            from: bookmarkDoc.fromCurrency,
            to: bookmarkDoc.toCurrency,
            rate: bookmarkDoc.currentRate.toFixed(4),
            trend: bookmarkDoc.trend
          });
        } catch (error) {
          console.error(`Error updating bookmark ${bookmark._id}:`, error);
          updatedBookmarks.push({
            id: bookmark._id,
            from: bookmark.fromCurrency,
            to: bookmark.toCurrency,
            rate: bookmark.currentRate.toFixed(4),
            trend: bookmark.trend
          });
        }
      } else {
        updatedBookmarks.push({
          id: bookmark._id,
          from: bookmark.fromCurrency,
          to: bookmark.toCurrency,
          rate: bookmark.currentRate.toFixed(4),
          trend: bookmark.trend
        });
      }
    }
    
    // Format recent history
    const formattedHistory = recentHistory.map(item => ({
      id: item._id,
      from: item.fromCurrency,
      to: item.toCurrency,
      amount: item.amount,
      rate: item.rate.toFixed(4),
      result: item.finalAmount.toFixed(2),
      timestamp: formatRelativeTime(item.timestamp)
    }));
    
    // Get basic stats
    const totalConversions = await ConversionHistory.countDocuments({ userId });
    const totalBookmarks = await BookmarkedPairs.countDocuments({ userId });
    
    // Get total converted amount (in USD equivalent for simplicity)
    const totalAmountPipeline = [
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ];
    const totalAmountResult = await ConversionHistory.aggregate(totalAmountPipeline);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;
    
    res.json({
      user: {
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar
      },
      stats: {
        totalConversions,
        totalBookmarks,
        totalAmount: totalAmount.toFixed(2)
      },
      recentHistory: formattedHistory,
      bookmarkedPairs: updatedBookmarks,
      newsItems: getMockForexNews() // Mock news for now
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error fetching dashboard data' });
  }
};

exports.getForexNews = async (req, res) => {
  try {
    // For now, return mock news data
    // In production, you could integrate with a real news API
    const newsItems = getMockForexNews();
    
    res.json(newsItems);
    
  } catch (error) {
    console.error('Error fetching forex news:', error);
    res.status(500).json({ error: 'Internal server error fetching news' });
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

// Mock forex news data
function getMockForexNews() {
  const now = new Date();
  
  return [
    {
      id: 1,
      title: 'Federal Reserve Announces Interest Rate Decision',
      date: formatRelativeTime(new Date(now - 2 * 60 * 60 * 1000)) // 2 hours ago
    },
    {
      id: 2,
      title: 'EUR/USD Reaches New Monthly High Amid ECB Policy',
      date: formatRelativeTime(new Date(now - 4 * 60 * 60 * 1000)) // 4 hours ago
    },
    {
      id: 3,
      title: 'Cryptocurrency Market Impact on Traditional Forex',
      date: formatRelativeTime(new Date(now - 6 * 60 * 60 * 1000)) // 6 hours ago
    },
    {
      id: 4,
      title: 'Asian Markets Open Strong Following US Session',
      date: formatRelativeTime(new Date(now - 8 * 60 * 60 * 1000)) // 8 hours ago
    },
    {
      id: 5,
      title: 'UK Inflation Data Affects GBP Exchange Rates',
      date: formatRelativeTime(new Date(now - 12 * 60 * 60 * 1000)) // 12 hours ago
    },
    {
      id: 6,
      title: 'Oil Prices Surge Impact on Currency Markets',
      date: formatRelativeTime(new Date(now - 24 * 60 * 60 * 1000)) // 1 day ago
    }
  ];
}
