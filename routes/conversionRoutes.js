const express = require('express');
const router = express.Router();
const conversionController = require('../controllers/conversionController');
const historicalController = require('../controllers/historicalController');
const { getCurrentUser } = require('../middleware/auth');

// Convert currency - works for both authenticated and non-authenticated users
router.post('/', getCurrentUser, conversionController.convertCurrency);

// Get live exchange rate
router.get('/rates/live/:from/:to', conversionController.getLiveRate);

// Get historical exchange rates for graphs
router.get('/rates/historical', historicalController.getHistoricalData);

// Fast historical data endpoint (bypasses heavy middleware)
router.get('/rates/historical-fast', async (req, res) => {
  try {
    const { fromCurrency, toCurrency, startDate, endDate } = req.query;
    
    if (!fromCurrency || !toCurrency || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const { getHistoricalExchangeRates } = require('../utils/exchangeRateAPI');
    const result = await getHistoricalExchangeRates(fromCurrency, toCurrency, startDate, endDate);
    
    // Quick format for frontend
    const chartData = {
      labels: result.data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: `${fromCurrency} to ${toCurrency}`,
        data: result.data.map(item => item.rate),
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        fill: true,
        tension: 0.1
      }]
    };
    
    const rates = result.data.map(item => item.rate);
    const stats = {
      highest: Math.max(...rates),
      lowest: Math.min(...rates),
      average: rates.reduce((a, b) => a + b, 0) / rates.length
    };
    
    res.json({ chartData, stats });
  } catch (error) {
    console.error('Fast historical API error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
