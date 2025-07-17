const BookmarkedPairs = require('../models/BookmarkedPairs');
const { getLiveExchangeRate, getMockExchangeRate } = require('../utils/exchangeRateAPI');

exports.getBookmarks = async (req, res) => {
  try {
    const bookmarks = await BookmarkedPairs.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    
    const formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark._id,
      from: bookmark.fromCurrency,
      to: bookmark.toCurrency,
      rate: bookmark.currentRate.toFixed(4),
      trend: bookmark.trend,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt
    }));
    
    res.json(formattedBookmarks);
    
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Internal server error fetching bookmarks' });
  }
};

exports.addBookmark = async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.body;
    
    // Input validation
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'Missing required fields: fromCurrency, toCurrency' });
    }
    
    if (fromCurrency === toCurrency) {
      return res.status(400).json({ error: 'From and To currencies cannot be the same' });
    }
    
    // Check if bookmark already exists
    const existingBookmark = await BookmarkedPairs.findOne({
      userId: req.user._id,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase()
    });
    
    if (existingBookmark) {
      return res.status(409).json({ error: 'Currency pair already bookmarked' });
    }
    
    // Get current exchange rate
    let currentRate;
    try {
      const rateData = await getLiveExchangeRate(fromCurrency, toCurrency);
      currentRate = rateData.rate;
    } catch (error) {
      console.warn('Using mock exchange rate for bookmark:', error.message);
      currentRate = getMockExchangeRate(fromCurrency, toCurrency);
    }
    
    // Create new bookmark
    const bookmark = new BookmarkedPairs({
      userId: req.user._id,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      currentRate,
      trend: 'neutral'
    });
    
    await bookmark.save();
    
    res.status(201).json({
      message: 'Currency pair bookmarked successfully',
      bookmark: {
        id: bookmark._id,
        from: bookmark.fromCurrency,
        to: bookmark.toCurrency,
        rate: bookmark.currentRate.toFixed(4),
        trend: bookmark.trend
      }
    });
    
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Internal server error adding bookmark' });
  }
};

exports.removeBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find and delete the bookmark
    const bookmark = await BookmarkedPairs.findOneAndDelete({
      _id: id,
      userId: req.user._id // Ensure user can only delete their own bookmarks
    });
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    res.json({ message: 'Bookmark removed successfully' });
    
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Internal server error removing bookmark' });
  }
};

exports.updateBookmarkRate = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the bookmark
    const bookmark = await BookmarkedPairs.findOne({
      _id: id,
      userId: req.user._id
    });
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    // Get new exchange rate
    let newRate;
    try {
      const rateData = await getLiveExchangeRate(bookmark.fromCurrency, bookmark.toCurrency);
      newRate = rateData.rate;
    } catch (error) {
      console.warn('Using mock exchange rate for update:', error.message);
      newRate = getMockExchangeRate(bookmark.fromCurrency, bookmark.toCurrency);
    }
    
    // Update rate and trend
    await bookmark.updateRate(newRate);
    
    res.json({
      message: 'Bookmark rate updated successfully',
      bookmark: {
        id: bookmark._id,
        from: bookmark.fromCurrency,
        to: bookmark.toCurrency,
        rate: bookmark.currentRate.toFixed(4),
        trend: bookmark.trend
      }
    });
    
  } catch (error) {
    console.error('Error updating bookmark rate:', error);
    res.status(500).json({ error: 'Internal server error updating bookmark rate' });
  }
};

exports.updateAllBookmarkRates = async (req, res) => {
  try {
    const bookmarks = await BookmarkedPairs.find({ userId: req.user._id });
    
    if (bookmarks.length === 0) {
      return res.json({ 
        message: 'No bookmarks to update',
        updatedCount: 0 
      });
    }
    
    let updatedCount = 0;
    const results = [];
    
    // Update each bookmark
    for (const bookmark of bookmarks) {
      try {
        let newRate;
        try {
          const rateData = await getLiveExchangeRate(bookmark.fromCurrency, bookmark.toCurrency);
          newRate = rateData.rate;
        } catch (error) {
          console.warn(`Using mock rate for ${bookmark.fromCurrency}-${bookmark.toCurrency}:`, error.message);
          newRate = getMockExchangeRate(bookmark.fromCurrency, bookmark.toCurrency);
        }
        
        await bookmark.updateRate(newRate);
        updatedCount++;
        
        results.push({
          id: bookmark._id,
          from: bookmark.fromCurrency,
          to: bookmark.toCurrency,
          rate: bookmark.currentRate.toFixed(4),
          trend: bookmark.trend,
          updated: true
        });
      } catch (error) {
        console.error(`Error updating bookmark ${bookmark._id}:`, error);
        results.push({
          id: bookmark._id,
          from: bookmark.fromCurrency,
          to: bookmark.toCurrency,
          updated: false,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Updated ${updatedCount} out of ${bookmarks.length} bookmarks`,
      updatedCount,
      totalCount: bookmarks.length,
      results
    });
    
  } catch (error) {
    console.error('Error updating all bookmark rates:', error);
    res.status(500).json({ error: 'Internal server error updating bookmark rates' });
  }
};

exports.checkBookmarkExists = async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.query;
    
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'Missing currency parameters' });
    }
    
    const exists = await BookmarkedPairs.bookmarkExists(
      req.user._id,
      fromCurrency,
      toCurrency
    );
    
    res.json({ exists });
    
  } catch (error) {
    console.error('Error checking bookmark existence:', error);
    res.status(500).json({ error: 'Internal server error checking bookmark' });
  }
};
