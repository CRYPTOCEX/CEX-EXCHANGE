onmessage = (e) => {
  const { marketData, tickerData } = e.data;

  // Validate input data to ensure it's as expected
  if (!Array.isArray(marketData) || typeof tickerData !== 'object' || tickerData === null) {
    postMessage(marketData || []);
    return;
  }

  for (let i = 0; i < marketData.length; i++) {
    const item = marketData[i];
    if (!item || typeof item.symbol !== 'string') {
      continue; // Skip if item or symbol is invalid
    }

    const ticker = tickerData[item.symbol];
    if (!ticker || typeof ticker.last !== 'number' || typeof ticker.change !== 'number') {
      // If no ticker or invalid data, item remains unchanged
      continue;
    }

    const precision = (typeof item.precision === 'number' && item.precision > 0) ? item.precision : 6;

    // Update existing item, converting last and change to strings with appropriate precision
    item.price = ticker.last.toFixed(precision);
    item.change = ticker.change.toFixed(2);
  }

  postMessage(marketData);
};
