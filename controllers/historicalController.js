const { getHistoricalExchangeRates } = require('../utils/exchangeRateAPI');

exports.getHistoricalData = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, startDate, endDate } = req.query;
    
    // Input validation
    if (!fromCurrency || !toCurrency || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required parameters: fromCurrency, toCurrency, startDate, endDate' 
      });
    }
    
    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    if (start > end) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }
    
    // Check if date range is not too large (limit to 1 year)
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({ error: 'Date range cannot exceed 365 days' });
    }
    
    try {
      // Get historical data
      const historicalData = await getHistoricalExchangeRates(
        fromCurrency,
        toCurrency,
        startDate,
        endDate
      );
      
      // Format data for Chart.js
      const chartData = {
        labels: historicalData.data.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
        }),
        datasets: [{
          label: `${fromCurrency} to ${toCurrency}`,
          data: historicalData.data.map(item => item.rate),
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          fill: true,
          tension: 0.1
        }]
      };
      
      // Calculate statistics
      const rates = historicalData.data.map(item => item.rate);
      const stats = {
        highest: Math.max(...rates),
        lowest: Math.min(...rates),
        average: rates.reduce((a, b) => a + b, 0) / rates.length,
        dataPoints: rates.length
      };
      
      res.json({
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        startDate,
        endDate,
        chartData,
        stats,
        source: historicalData.source
      });
      
    } catch (error) {
      console.error('Error fetching historical data:', error);
      
      // Fallback to mock data for development
      const mockData = generateMockHistoricalData(fromCurrency, toCurrency, start, end);
      
      res.json({
        fromCurrency: fromCurrency.toUpperCase(),
        toCurrency: toCurrency.toUpperCase(),
        startDate,
        endDate,
        chartData: mockData.chartData,
        stats: mockData.stats,
        source: 'mock',
        warning: 'Using mock data due to API unavailability'
      });
    }
    
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({ error: 'Internal server error fetching historical data' });
  }
};

// Generate mock historical data for development
function generateMockHistoricalData(fromCurrency, toCurrency, startDate, endDate) {
  const data = [];
  const labels = [];
  
  // Base rate for the currency pair
  const baseRates = {
    'USD-INR': 83.25,
    'USD-EUR': 0.92,
    'USD-GBP': 0.79,
    'USD-JPY': 149.50,
    'EUR-USD': 1.08,
    'GBP-USD': 1.27,
    'JPY-USD': 0.0067
  };
  
  const key = `${fromCurrency}-${toCurrency}`;
  const reverseKey = `${toCurrency}-${fromCurrency}`;
  
  let baseRate = baseRates[key] || (baseRates[reverseKey] ? 1 / baseRates[reverseKey] : 1.0);
  
  // Generate data points
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    // Add some random variation (±5%)
    const variation = (Math.random() - 0.5) * 0.1;
    const rate = baseRate * (1 + variation);
    
    data.push(rate);
    labels.push(current.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }));
    
    current.setDate(current.getDate() + 1);
  }
  
  // Calculate statistics
  const stats = {
    highest: Math.max(...data),
    lowest: Math.min(...data),
    average: data.reduce((a, b) => a + b, 0) / data.length,
    dataPoints: data.length
  };
  
  return {
    chartData: {
      labels,
      datasets: [{
        label: `${fromCurrency} to ${toCurrency}`,
        data,
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        fill: true,
        tension: 0.1
      }]
    },
    stats
  };
}
