import ExchangeManager from "@b/utils/exchange";
import { hasClients, sendMessageToRoute } from "@b/handler/Websocket";
import { logError } from "@b/utils/logger";
import { loadBanStatus, saveBanStatus, handleExchangeError } from "../utils";

export const metadata = {};

class BaseMarketDataHandler {
  protected accumulatedBuffer: { [key: string]: any } = {};
  protected bufferInterval: NodeJS.Timeout | null = null;
  protected unblockTime = 0;
  protected activeSubscriptions: Set<string> = new Set();
  protected exchange: any = null;
  protected symbolToStreamKey: { [key: string]: string } = {};

  constructor() {}

  protected flushBuffer(type: string) {
    Object.entries(this.accumulatedBuffer).forEach(([streamKey, data]) => {
      if (Object.keys(data).length > 0) {
        const route = `/api/exchange/market`;
        const payload = { ...data.payload, symbol: data.symbol };
        sendMessageToRoute(route, payload, {
          stream: streamKey, // Do not include the symbol in the stream key for frontend
          data: data.msg,
        });
        delete this.accumulatedBuffer[streamKey];
      }
    });
  }

  protected async fetchDataWithRetries(fetchFunction: () => Promise<any>) {
    if (Date.now() < this.unblockTime) {
      throw new Error(
        `Blocked until ${new Date(this.unblockTime).toLocaleString()}`
      );
    }
    return await fetchFunction();
  }

  protected async handleSubscription(
    symbol: string,
    type: string,
    interval?: string,
    limit?: number
  ) {
    const frontendStreamKey = `${type}${interval ? `:${interval}` : ""}${
      limit ? `:${limit}` : ""
    }`;
    const internalStreamKey = `${symbol}:${frontendStreamKey}`;

    this.symbolToStreamKey[frontendStreamKey] = symbol;

    const fetchData = {
      ticker: async () => ({
        msg: await this.exchange.watchTicker(symbol),
        payload: { type },
      }),
      ohlcv: async () => ({
        msg: await this.exchange.watchOHLCV(
          symbol,
          interval,
          undefined,
          Number(limit) || 1000
        ),
        payload: { type, interval, limit },
      }),
      trades: async () => ({
        msg: await this.exchange.watchTrades(
          symbol,
          undefined,
          limit ? Number(limit) : 20
        ),
        payload: { type, limit },
      }),
      orderbook: async () => ({
        msg: await this.exchange.watchOrderBook(
          symbol,
          limit ? Number(limit) : 100
        ),
        payload: { type, limit },
      }),
    };

    while (
      this.activeSubscriptions.has(internalStreamKey) &&
      hasClients(`/api/exchange/market`)
    ) {
      try {
        if (Date.now() < this.unblockTime) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        const { msg, payload } = await this.fetchDataWithRetries(() =>
          fetchData[type]()
        );
        this.accumulatedBuffer[frontendStreamKey] = { symbol, msg, payload };

        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        logError("exchange", error, __filename);
        const result = await handleExchangeError(error, ExchangeManager);
        if (typeof result === "number") {
          this.unblockTime = result;
          await saveBanStatus(this.unblockTime);
        } else {
          this.exchange = result;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    this.activeSubscriptions.delete(internalStreamKey);
  }

  public async start(message: any, flushInterval: number) {
    try {
      this.unblockTime = await loadBanStatus();

      if (typeof message === "string") {
        message = JSON.parse(message);
      }

      const { symbol, type, interval, limit } = message.payload;

      if (!this.bufferInterval) {
        this.bufferInterval = setInterval(
          () => this.flushBuffer(type),
          flushInterval
        );
      }

      if (!this.exchange) {
        this.exchange = await ExchangeManager.startExchange();
        if (!this.exchange) {
          throw new Error("Failed to start exchange");
        }
      }

      const typeMap = {
        ticker: "watchTicker",
        ohlcv: "watchOHLCV",
        trades: "watchTrades",
        orderbook: "watchOrderBook",
      };

      if (!this.exchange.has[typeMap[type]]) {
        console.info(`Endpoint ${type} is not available`);
        return;
      }

      const internalStreamKey = `${symbol}:${type}${
        interval ? `:${interval}` : ""
      }${limit ? `:${limit}` : ""}`;

      if (!this.activeSubscriptions.has(internalStreamKey)) {
        this.activeSubscriptions.add(internalStreamKey);
        this.handleSubscription(symbol, type, interval, limit);
      }
    } catch (error) {
      logError("exchange", error, __filename);
    }
  }

  public async stop() {
    this.activeSubscriptions.clear();
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval);
      this.bufferInterval = null;
    }
    if (this.exchange) {
      await ExchangeManager.stopExchange();
      this.exchange = null;
    }
  }
}

export class TickerHandler extends BaseMarketDataHandler {
  private static instance: TickerHandler;

  private constructor() {
    super();
  }

  public static getInstance(): TickerHandler {
    if (!TickerHandler.instance) {
      TickerHandler.instance = new TickerHandler();
    }
    return TickerHandler.instance;
  }
}

export class OHLCVHandler extends BaseMarketDataHandler {
  private static instance: OHLCVHandler;

  private constructor() {
    super();
  }

  public static getInstance(): OHLCVHandler {
    if (!OHLCVHandler.instance) {
      OHLCVHandler.instance = new OHLCVHandler();
    }
    return OHLCVHandler.instance;
  }
}

export class TradesHandler extends BaseMarketDataHandler {
  private static instance: TradesHandler;

  private constructor() {
    super();
  }

  public static getInstance(): TradesHandler {
    if (!TradesHandler.instance) {
      TradesHandler.instance = new TradesHandler();
    }
    return TradesHandler.instance;
  }
}

export class OrderbookHandler extends BaseMarketDataHandler {
  private static instance: OrderbookHandler;

  private constructor() {
    super();
  }

  public static getInstance(): OrderbookHandler {
    if (!OrderbookHandler.instance) {
      OrderbookHandler.instance = new OrderbookHandler();
    }
    return OrderbookHandler.instance;
  }
}

export default async (data: Handler, message: any) => {
  let parsedMessage;
  if (typeof message === "string") {
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      logError("Invalid JSON message", error, __filename);
      return;
    }
  } else {
    parsedMessage = message;
  }

  const { type } = parsedMessage.payload;

  switch (type) {
    case "ticker":
      await TickerHandler.getInstance().start(parsedMessage, 500);
      break;
    case "ohlcv":
      await OHLCVHandler.getInstance().start(parsedMessage, 400);
      break;
    case "trades":
      await TradesHandler.getInstance().start(parsedMessage, 700);
      break;
    case "orderbook":
      await OrderbookHandler.getInstance().start(parsedMessage, 600);
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};
