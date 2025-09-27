import { messageBroker } from "@b/handler/Websocket";

// Safe import for ecosystem modules
let fromBigInt: any;
let fromWei: any;
try {
  const module = require("../../ecosystem/utils/blockchain");
  fromBigInt = module.fromBigInt;
  fromWei = module.fromWei;
} catch (e) {
  // Ecosystem extension not available
}

export async function handleOrderBookBroadcast(symbol: string, book: any) {
  try {
    if (!book) {
      console.error("Book is undefined");
      return;
    }

    if (!fromWei) {
      console.warn("Ecosystem extension not available for order book broadcast");
      return;
    }

    const threshold = 1e-10;

    const orderbook = {
      asks: Object.entries(book.asks || {})
        .map(([price, amount]) => [
          fromWei(Number(price)),
          fromWei(Number(amount)),
        ])
        .filter(([price, amount]) => price > threshold && amount > threshold),
      bids: Object.entries(book.bids || {})
        .map(([price, amount]) => [
          fromWei(Number(price)),
          fromWei(Number(amount)),
        ])
        .filter(([price, amount]) => price > threshold && amount > threshold),
    };

    messageBroker.broadcastToSubscribedClients(
      `/api/futures/market`,
      { type: "orderbook", symbol },
      {
        stream: "orderbook",
        data: orderbook,
      }
    );
  } catch (error) {
    console.error(`Failed to fetch and broadcast order book: ${error}`);
  }
}

export async function handleOrderBroadcast(order: any) {
  if (!fromBigInt) {
    console.warn("Ecosystem extension not available for order broadcast");
    return;
  }

  const filteredOrder = {
    ...order,
    price: fromBigInt(order.price),
    amount: fromBigInt(order.amount),
    filled: fromBigInt(order.filled),
    remaining: fromBigInt(order.remaining),
    cost: fromBigInt(order.cost),
    fee: fromBigInt(order.fee),
    average: fromBigInt(order.average),
    leverage: fromBigInt(order.leverage),
    stopLossPrice: order.stopLossPrice
      ? fromBigInt(order.stopLossPrice)
      : undefined,
    takeProfitPrice: order.takeProfitPrice
      ? fromBigInt(order.takeProfitPrice)
      : undefined,
  };

  messageBroker.broadcastToSubscribedClients(
    `/api/futures/market/${order.symbol}`,
    { type: "orders", userId: order.userId },
    {
      stream: "orders",
      data: filteredOrder,
    }
  );
}

export async function handleTradesBroadcast(symbol: string, trades: any) {
  messageBroker.broadcastToSubscribedClients(
    `/api/futures/market`,
    { type: "trades", symbol },
    {
      stream: "trades",
      data: trades,
    }
  );
}

export async function handleTickerBroadcast(symbol: string, ticker: any) {
  messageBroker.broadcastToSubscribedClients(
    `/api/futures/market`,
    { type: "ticker", symbol },
    {
      stream: "ticker",
      data: ticker,
    }
  );
}

export async function handleCandleBroadcast(
  symbol: string,
  interval: string,
  candle: any
) {
  if (!candle || !candle.createdAt) {
    console.error("Candle data or createdAt property is missing");
    return;
  }

  const parsedCandle = [
    new Date(candle.createdAt).getTime(),
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    candle.volume,
  ];

  messageBroker.broadcastToSubscribedClients(
    `/api/futures/market`,
    { type: "ohlcv", interval, symbol },
    {
      stream: "ohlcv",
      data: [parsedCandle],
    }
  );
}

export async function handleTickersBroadcast(tickers: any) {
  messageBroker.broadcastToSubscribedClients(
    `/api/futures/ticker`,
    { type: "tickers" },
    {
      stream: "tickers",
      data: tickers,
    }
  );
}

export async function handlePositionBroadcast(position: any) {
  if (!fromBigInt) {
    console.warn("Ecosystem extension not available for position broadcast");
    return;
  }

  const filteredPosition = {
    ...position,
    entryPrice: fromBigInt(position.entryPrice),
    amount: fromBigInt(position.amount),
    unrealizedPnl: fromBigInt(position.unrealizedPnl),
    stopLossPrice: position.stopLossPrice
      ? fromBigInt(position.stopLossPrice)
      : undefined,
    takeProfitPrice: position.takeProfitPrice
      ? fromBigInt(position.takeProfitPrice)
      : undefined,
  };

  messageBroker.broadcastToSubscribedClients(
    `/api/futures/market/${position.symbol}`,
    { type: "positions", userId: position.userId },
    {
      stream: "positions",
      data: filteredPosition,
    }
  );
}
