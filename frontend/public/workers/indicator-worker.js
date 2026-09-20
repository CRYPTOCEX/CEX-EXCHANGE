// Binary Chart - Indicator Calculation Web Worker
// PERFORMANCE: Off-main-thread indicator calculations

// ============================================================================
// INDICATOR CALCULATION FUNCTIONS
// ============================================================================

/**
 * Simple Moving Average (SMA)
 */
function calculateSMA(prices, period) {
  const result = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    result[i] = sum / period;
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
function calculateEMA(prices, period) {
  const result = new Array(prices.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  result[period - 1] = sum / period;

  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    result[i] = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
  }

  return result;
}

/**
 * Relative Strength Index (RSI)
 */
function calculateRSI(prices, period = 14) {
  const result = new Array(prices.length).fill(null);
  const gains = [];
  const losses = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate first average gain/loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Calculate RSI
  for (let i = period; i < prices.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }

  return result;
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLine = new Array(prices.length).fill(null);
  const signalLine = new Array(prices.length).fill(null);
  const histogram = new Array(prices.length).fill(null);

  // Calculate MACD line
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = fastEMA[i] - slowEMA[i];
    }
  }

  // Calculate signal line (EMA of MACD)
  const validMacdValues = macdLine.filter(v => v !== null);
  if (validMacdValues.length >= signalPeriod) {
    const signalEMA = calculateEMA(validMacdValues, signalPeriod);
    let signalIdx = 0;
    for (let i = 0; i < prices.length; i++) {
      if (macdLine[i] !== null) {
        if (signalIdx >= signalPeriod - 1) {
          signalLine[i] = signalEMA[signalIdx];
        }
        signalIdx++;
      }
    }
  }

  // Calculate histogram
  for (let i = 0; i < prices.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram[i] = macdLine[i] - signalLine[i];
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Bollinger Bands
 */
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const middle = calculateSMA(prices, period);
  const upper = new Array(prices.length).fill(null);
  const lower = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    // Calculate standard deviation
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(prices[i - j] - middle[i], 2);
    }
    const std = Math.sqrt(sum / period);

    upper[i] = middle[i] + stdDev * std;
    lower[i] = middle[i] - stdDev * std;
  }

  return { upper, middle, lower };
}

/**
 * Average True Range (ATR)
 */
function calculateATR(candles, period = 14) {
  const result = new Array(candles.length).fill(null);
  const trueRanges = [];

  for (let i = 0; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = i > 0 ? candles[i - 1].close : candles[i].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);

    if (i >= period - 1) {
      if (i === period - 1) {
        // First ATR is simple average
        result[i] = trueRanges.reduce((a, b) => a + b, 0) / period;
      } else {
        // Smoothed ATR
        result[i] = (result[i - 1] * (period - 1) + tr) / period;
      }
    }
  }

  return result;
}

/**
 * Stochastic Oscillator
 */
function calculateStochastic(candles, kPeriod = 14, dPeriod = 3) {
  const kValues = new Array(candles.length).fill(null);
  const dValues = new Array(candles.length).fill(null);

  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, candles[i - j].high);
      lowestLow = Math.min(lowestLow, candles[i - j].low);
    }

    const range = highestHigh - lowestLow;
    if (range > 0) {
      kValues[i] = ((candles[i].close - lowestLow) / range) * 100;
    } else {
      kValues[i] = 50;
    }
  }

  // Calculate %D (SMA of %K)
  for (let i = kPeriod - 1 + dPeriod - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kValues[i - j] || 0;
    }
    dValues[i] = sum / dPeriod;
  }

  return { k: kValues, d: dValues };
}

// ============================================================================
// INDICATOR REGISTRY
// ============================================================================

const indicatorCalculators = {
  SMA: (candles, params) => {
    const prices = candles.map(c => c.close);
    return { sma: calculateSMA(prices, params.period || 20) };
  },

  EMA: (candles, params) => {
    const prices = candles.map(c => c.close);
    return { ema: calculateEMA(prices, params.period || 20) };
  },

  RSI: (candles, params) => {
    const prices = candles.map(c => c.close);
    return { rsi: calculateRSI(prices, params.period || 14) };
  },

  MACD: (candles, params) => {
    const prices = candles.map(c => c.close);
    return calculateMACD(
      prices,
      params.fastPeriod || 12,
      params.slowPeriod || 26,
      params.signalPeriod || 9
    );
  },

  BOLLINGER: (candles, params) => {
    const prices = candles.map(c => c.close);
    return calculateBollingerBands(
      prices,
      params.period || 20,
      params.stdDev || 2
    );
  },

  ATR: (candles, params) => {
    return { atr: calculateATR(candles, params.period || 14) };
  },

  STOCHASTIC: (candles, params) => {
    return calculateStochastic(
      candles,
      params.kPeriod || 14,
      params.dPeriod || 3
    );
  },
};

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = function(event) {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case "CALCULATE": {
        const { indicatorType, candles, params } = payload;
        const calculator = indicatorCalculators[indicatorType];

        if (!calculator) {
          self.postMessage({
            id,
            type: "ERROR",
            error: `Unknown indicator type: ${indicatorType}`,
          });
          return;
        }

        const startTime = performance.now();
        const result = calculator(candles, params);
        const duration = performance.now() - startTime;

        self.postMessage({
          id,
          type: "RESULT",
          payload: {
            indicatorType,
            result,
            duration,
          },
        });
        break;
      }

      case "CALCULATE_BATCH": {
        const { indicators, candles } = payload;
        const results = {};
        const startTime = performance.now();

        for (const indicator of indicators) {
          const calculator = indicatorCalculators[indicator.type];
          if (calculator) {
            results[indicator.id] = calculator(candles, indicator.params);
          }
        }

        const duration = performance.now() - startTime;

        self.postMessage({
          id,
          type: "BATCH_RESULT",
          payload: {
            results,
            duration,
          },
        });
        break;
      }

      case "PING": {
        self.postMessage({ id, type: "PONG" });
        break;
      }

      default:
        self.postMessage({
          id,
          type: "ERROR",
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({
      id,
      type: "ERROR",
      error: error.message || "Calculation failed",
    });
  }
};

console.log("[Indicator Worker] Ready");
