const axios = require('axios');

// Create optimized axios instance
const fastAxios = axios.create({
  timeout: 3000, // 3 second timeout
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'CurrencyConverter/1.0',
    'Accept-Encoding': 'gzip, deflate'
  }
});

// Get live exchange rate from exchangerate-api
const getLiveExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }
    
    return {
      rate,
      timestamp: new Date(response.data.date),
      source: 'exchangerate-api'
    };
  } catch (error) {
    console.error('Error fetching live exchange rate:', error);
    throw new Error('Failed to fetch live exchange rate');
  }
};

// Get historical exchange rates from Open Exchange Rates API (per day calls)
const getHistoricalExchangeRates = async (fromCurrency, toCurrency, startDate, endDate) => {
  // Build the Frankfurter URL: {start}..{end}
  const url = `https://api.frankfurter.dev/v1/${startDate}..${endDate}`;
  
  try {
    const { data } = await fastAxios.get(url, {
      params: {
        base: fromCurrency,
        symbols: toCurrency,
      }
    });

    // data.rates is an object: { '2025-06-01': { INR: 82.3 }, ... }
    const historicalData = Object.entries(data.rates)
      .map(([date, rates]) => ({
        date,
        rate: parseFloat(rates[toCurrency]) || 0,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date

    return {
      fromCurrency,
      toCurrency,
      data: historicalData,
      source: 'frankfurter'
    };
  } catch (err) {
    console.error('Error fetching historical data from Frankfurter:', err.message);
    throw new Error('Failed to fetch historical exchange rates via Frankfurter');
  }
};



// Fallback function to get mock exchange rate (for development)
const getMockExchangeRate = (fromCurrency, toCurrency) => {
  const mockRates = {
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
  
  if (mockRates[key]) {
    return mockRates[key];
  } else if (mockRates[reverseKey]) {
    return 1 / mockRates[reverseKey];
  } else {
    // Generate random rate for testing
    return Math.random() * 10 + 0.1;
  }
};

module.exports = {
  getLiveExchangeRate,
  getHistoricalExchangeRates,
  getMockExchangeRate
};
