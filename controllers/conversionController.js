const { getLiveExchangeRate, getMockExchangeRate } = require('../utils/exchangeRateAPI');
const ConversionHistory = require('../models/ConversionHistory');

exports.convertCurrency = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount, feeType = 'none', saveHistory = true } = req.body;
    
    // Input validation
    if (!fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({ error: 'Missing required fields: fromCurrency, toCurrency, amount' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    
    // Get exchange rate
    let exchangeRate;
    try {
      const rateData = await getLiveExchangeRate(fromCurrency, toCurrency);
      exchangeRate = rateData.rate;
    } catch (error) {
      // Fallback to mock rate for development
      console.warn('Using mock exchange rate:', error.message);
      exchangeRate = getMockExchangeRate(fromCurrency, toCurrency);
    }
    
    // Calculate conversion
    const convertedAmount = parseFloat(amount) * exchangeRate;
    
    // Fee calculation
    const feeOptions = {
      none: 0,
      bank: 3,
      paypal: 4,
      wise: 0.5,
      western_union: 5
    };
    
    const feePercentage = feeOptions[feeType] || 0;
    const feeAmount = (convertedAmount * feePercentage) / 100;
    const finalAmount = convertedAmount - feeAmount;
    
    // Save to history if user is authenticated and saveHistory is true
    if (req.user && saveHistory) {
      try {
        const historyEntry = new ConversionHistory({
          userId: req.user._id,
          fromCurrency: fromCurrency.toUpperCase(),
          toCurrency: toCurrency.toUpperCase(),
          amount: parseFloat(amount),
          rate: exchangeRate,
          convertedAmount,
          feeType,
          feeAmount,
          finalAmount
        });
        await historyEntry.save();
      } catch (error) {
        console.error('Error saving conversion history:', error);
        // Don't fail the conversion if history saving fails
      }
    }
    
    // Return conversion result
    res.json({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      amount: parseFloat(amount),
      rate: exchangeRate,
      convertedAmount: parseFloat(convertedAmount.toFixed(2)),
      feeType,
      feePercentage,
      feeAmount: parseFloat(feeAmount.toFixed(2)),
      finalAmount: parseFloat(finalAmount.toFixed(2)),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ error: 'Internal server error during conversion' });
  }
};

exports.getLiveRate = async (req, res) => {
  try {
    const { from, to } = req.params;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing currency parameters' });
    }
    
    // Get live exchange rate
    let rateData;
    try {
      rateData = await getLiveExchangeRate(from, to);
    } catch (error) {
      // Fallback to mock rate for development
      console.warn('Using mock exchange rate:', error.message);
      rateData = {
        rate: getMockExchangeRate(from, to),
        timestamp: new Date(),
        source: 'mock'
      };
    }
    
    res.json({
      fromCurrency: from.toUpperCase(),
      toCurrency: to.toUpperCase(),
      rate: rateData.rate,
      timestamp: rateData.timestamp,
      source: rateData.source
    });
    
  } catch (error) {
    console.error('Live rate fetch error:', error);
    res.status(500).json({ error: 'Internal server error fetching live rate' });
  }
};
