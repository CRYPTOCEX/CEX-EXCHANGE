import { ConnectionStatus } from "@/services/ws-manager";
import type { TickerData } from "../app/[locale]/trade/components/markets/types";
import { isExtensionAvailable } from "@/lib/extensions";
import { toNum } from "@/lib/precision-utils";

// Numeric ticker fields can arrive as strings (raw exchange payloads, DB
// DECIMAL columns serialized by the backend). The UI calls `.toFixed()` on them
// directly, which throws "X.toFixed is not a function" on a string and crashes
// the trade panels. Coerce every known numeric field to a real number at the
// ingestion boundary so no string ever reaches a formatter.
const NUMERIC_TICKER_FIELDS = [
  "last",
  "change",
  "percentage",
  "baseVolume",
  "quoteVolume",
  "high",
  "low",
  "bid",
  "ask",
  "open",
  "close",
  "fundingRate",
] as const;

function normalizeTicker(ticker: any): TickerData {
  if (!ticker || typeof ticker !== "object") return ticker as TickerData;
  const normalized: any = { ...ticker };
  for (const field of NUMERIC_TICKER_FIELDS) {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      normalized[field] = toNum(normalized[field]);
    }
  }
  return normalized as TickerData;
}

// Create a singleton WebSocket manager for ticker data
export class TickersWebSocketManager {
  private static instance: TickersWebSocketManager;

  // WebSocket connections
  private spotWs: WebSocket | null = null;
  private ecoWs: WebSocket | null = null;
  private futuresWs: WebSocket | null = null;
  private forexWs: WebSocket | null = null;


  // Connection states
  private spotConnectionState: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private ecoConnectionState: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private futuresConnectionState: ConnectionStatus =
    ConnectionStatus.DISCONNECTED;
  private forexConnectionState: ConnectionStatus =
    ConnectionStatus.DISCONNECTED;


  // Subscription counts to track when we can close connections
  private spotSubscriptionCount = 0;
  private ecoSubscriptionCount = 0;
  private futuresSubscriptionCount = 0;
  private forexSubscriptionCount = 0;


  // Callbacks
  private spotCallbacks: Set<(data: Record<string, TickerData>) => void> =
    new Set();
  private ecoCallbacks: Set<(data: Record<string, TickerData>) => void> =
    new Set();
  private futuresCallbacks: Set<(data: Record<string, TickerData>) => void> =
    new Set();
  private forexCallbacks: Set<(data: Record<string, TickerData>) => void> =
    new Set();
  private connectionStatusCallbacks: Set<(status: ConnectionStatus) => void> =
    new Set();

  // Data cache
  private spotData: Record<string, TickerData> = {};
  private ecoData: Record<string, TickerData> = {};
  private futuresData: Record<string, TickerData> = {};
  private forexData: Record<string, TickerData> = {};

  // Connection promises to prevent multiple connection attempts
  private spotConnectionPromise: Promise<void> | null = null;
  private ecoConnectionPromise: Promise<void> | null = null;
  private futuresConnectionPromise: Promise<void> | null = null;
  private forexConnectionPromise: Promise<void> | null = null;


  // Connection timeouts to prevent premature closing
  private spotCloseTimeout: NodeJS.Timeout | null = null;
  private ecoCloseTimeout: NodeJS.Timeout | null = null;
  private futuresCloseTimeout: NodeJS.Timeout | null = null;
  private forexCloseTimeout: NodeJS.Timeout | null = null;


  private isInitialized = false;
  private isClosing = false;

  private constructor() {}

  public static getInstance(): TickersWebSocketManager {
    if (!TickersWebSocketManager.instance) {
      TickersWebSocketManager.instance = new TickersWebSocketManager();
    }
    return TickersWebSocketManager.instance;
  }

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.isClosing = false;
    // We no longer connect all at initialization
    // Instead, connections are made on-demand when subscribed
  }

  private createWebSocketUrl(path: string): string {
    // All backends now use /api/ prefix
    if (
      typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_WEBSOCKET_URL
    ) {
      return `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/${path}`;
    }

    const protocol =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "wss:"
        : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
    const host =
      typeof window !== "undefined"
        ? (isDev ? `${window.location.hostname}:${backendPort}` : window.location.host)
        : `localhost:${backendPort}`;
    return `${protocol}//${host}/${path}`;
  }

  // Get overall connection status (for UI indicators)
  public getConnectionStatus(): ConnectionStatus {
    // If any connection is in ERROR state, return ERROR
    if (
      this.spotConnectionState === ConnectionStatus.ERROR ||
      this.ecoConnectionState === ConnectionStatus.ERROR ||
      this.futuresConnectionState === ConnectionStatus.ERROR
    ) {
      return ConnectionStatus.ERROR;
    }

    // If any active connection is CONNECTING, return CONNECTING
    if (
      (this.spotSubscriptionCount > 0 &&
        this.spotConnectionState === ConnectionStatus.CONNECTING) ||
      (this.ecoSubscriptionCount > 0 &&
        this.ecoConnectionState === ConnectionStatus.CONNECTING) ||
      (this.futuresSubscriptionCount > 0 &&
        this.futuresConnectionState === ConnectionStatus.CONNECTING)
    ) {
      return ConnectionStatus.CONNECTING;
    }

    // If all active connections are CONNECTED, return CONNECTED
    if (
      (this.spotSubscriptionCount === 0 ||
        this.spotConnectionState === ConnectionStatus.CONNECTED) &&
      (this.ecoSubscriptionCount === 0 ||
        this.ecoConnectionState === ConnectionStatus.CONNECTED) &&
      (this.futuresSubscriptionCount === 0 ||
        this.futuresConnectionState === ConnectionStatus.CONNECTED)
    ) {
      return ConnectionStatus.CONNECTED;
    }

    // Otherwise, return DISCONNECTED
    return ConnectionStatus.DISCONNECTED;
  }

  // Connect to spot WebSocket
  private connectSpot(): Promise<void> {
    // If already connecting, return the existing promise
    if (this.spotConnectionPromise) {
      return this.spotConnectionPromise;
    }

    // If already connected, return resolved promise
    if (
      this.spotWs &&
      this.spotConnectionState === ConnectionStatus.CONNECTED
    ) {
      return Promise.resolve();
    }

    // Create new connection
    this.spotConnectionState = ConnectionStatus.CONNECTING;
    this.updateAllConnectionStatus();

    this.spotConnectionPromise = new Promise<void>((resolve, reject) => {
      const url = this.createWebSocketUrl("api/exchange/ticker");

      try {
        this.spotWs = new WebSocket(url);

        this.spotWs.onopen = () => {
          this.spotConnectionState = ConnectionStatus.CONNECTED;
          this.updateAllConnectionStatus();

          if (this.spotWs && this.spotWs.readyState === WebSocket.OPEN) {
            this.spotWs.send(
              JSON.stringify({
                action: "SUBSCRIBE",
                payload: { type: "tickers" },
              })
            );
          }

          resolve();
        };

        this.spotWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.data) {
              // Only update tickers that have new data
              Object.entries(data.data).forEach(([symbol, tickerData]) => {
                if (tickerData && (tickerData as TickerData).last !== undefined) {
                  this.spotData[symbol] = normalizeTicker(tickerData);
                }
              });
              this.notifySpotCallbacks(this.spotData);
            }
          } catch (error) {
            console.error("Error parsing spot WebSocket message:", error);
          }
        };

        this.spotWs.onerror = (error) => {
          console.error("Spot WebSocket error:", error);
          this.spotConnectionState = ConnectionStatus.ERROR;
          this.updateAllConnectionStatus();
          reject(error);
        };

        this.spotWs.onclose = () => {
          console.log("Spot WebSocket closed");
          this.spotWs = null;
          this.spotConnectionState = ConnectionStatus.DISCONNECTED;
          this.spotConnectionPromise = null;
          this.updateAllConnectionStatus();

          // Only attempt to reconnect if we still have subscribers and we're not in the process of closing
          if (this.spotSubscriptionCount > 0 && !this.isClosing) {
            // Attempt to reconnect after a delay
            setTimeout(() => {
              this.connectSpot().catch(console.error);
            }, 5000);
          }
        };
      } catch (error) {
        console.error("Error creating spot WebSocket:", error);
        this.spotConnectionState = ConnectionStatus.ERROR;
        this.updateAllConnectionStatus();
        this.spotConnectionPromise = null;
        reject(error);
      }
    });

    return this.spotConnectionPromise;
  }

  // Connect to eco WebSocket
  private connectEco(): Promise<void> {
    // Check if ecosystem extension is available
    if (!isExtensionAvailable("ecosystem")) {
      console.warn("Ecosystem extension not available, skipping eco WebSocket connection");
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.ecoConnectionPromise) {
      return this.ecoConnectionPromise;
    }

    // If already connected, return resolved promise
    if (this.ecoWs && this.ecoConnectionState === ConnectionStatus.CONNECTED) {
      return Promise.resolve();
    }

    // Create new connection
    this.ecoConnectionState = ConnectionStatus.CONNECTING;
    this.updateAllConnectionStatus();

    this.ecoConnectionPromise = new Promise<void>((resolve, reject) => {
      const url = this.createWebSocketUrl("api/ecosystem/ticker");

      try {
        this.ecoWs = new WebSocket(url);

        this.ecoWs.onopen = () => {
          this.ecoConnectionState = ConnectionStatus.CONNECTED;
          this.updateAllConnectionStatus();

          if (this.ecoWs && this.ecoWs.readyState === WebSocket.OPEN) {
            this.ecoWs.send(
              JSON.stringify({
                action: "SUBSCRIBE",
                payload: { type: "tickers" },
              })
            );
          }

          resolve();
        };

        this.ecoWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.data) {
              // Only update tickers that have new data
              Object.entries(data.data).forEach(([symbol, tickerData]) => {
                if (tickerData && (tickerData as TickerData).last !== undefined) {
                  this.ecoData[symbol] = normalizeTicker(tickerData);
                }
              });
              this.notifyEcoCallbacks(this.ecoData);
            }
          } catch (error) {
            console.error("Error parsing eco WebSocket message:", error);
          }
        };

        this.ecoWs.onerror = (error) => {
          console.error("Eco WebSocket error:", error);
          this.ecoConnectionState = ConnectionStatus.ERROR;
          this.updateAllConnectionStatus();
          reject(error);
        };

        this.ecoWs.onclose = () => {
          console.log("Eco WebSocket closed");
          this.ecoWs = null;
          this.ecoConnectionState = ConnectionStatus.DISCONNECTED;
          this.ecoConnectionPromise = null;
          this.updateAllConnectionStatus();

          // Only attempt to reconnect if we still have subscribers and we're not in the process of closing
          if (this.ecoSubscriptionCount > 0 && !this.isClosing) {
            // Attempt to reconnect after a delay
            setTimeout(() => {
              this.connectEco().catch(console.error);
            }, 5000);
          }
        };
      } catch (error) {
        console.error("Error creating eco WebSocket:", error);
        this.ecoConnectionState = ConnectionStatus.ERROR;
        this.updateAllConnectionStatus();
        this.ecoConnectionPromise = null;
        reject(error);
      }
    });

    return this.ecoConnectionPromise;
  }

  // Connect to futures WebSocket
  private connectFutures(): Promise<void> {
    // Check if futures extension is available
    if (!isExtensionAvailable("futures")) {
      console.warn("Futures extension not available, skipping futures WebSocket connection");
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.futuresConnectionPromise) {
      return this.futuresConnectionPromise;
    }

    // If already connected, return resolved promise
    if (
      this.futuresWs &&
      this.futuresConnectionState === ConnectionStatus.CONNECTED
    ) {
      return Promise.resolve();
    }

    // Create new connection
    this.futuresConnectionState = ConnectionStatus.CONNECTING;
    this.updateAllConnectionStatus();

    this.futuresConnectionPromise = new Promise<void>((resolve, reject) => {
      const url = this.createWebSocketUrl("api/futures/ticker");

      try {
        this.futuresWs = new WebSocket(url);

        this.futuresWs.onopen = () => {
          this.futuresConnectionState = ConnectionStatus.CONNECTED;
          this.updateAllConnectionStatus();

          if (this.futuresWs && this.futuresWs.readyState === WebSocket.OPEN) {
            this.futuresWs.send(
              JSON.stringify({
                action: "SUBSCRIBE",
                payload: { type: "tickers" },
              })
            );
          }

          resolve();
        };

        this.futuresWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.stream === "tickers" && message.data) {
              // Bulk tickers format: {"stream": "tickers", "data": {"SYMBOL": {...}}}
              Object.entries(message.data).forEach(([symbol, tickerData]) => {
                if (tickerData && (tickerData as TickerData).last !== undefined) {
                  this.futuresData[symbol] = normalizeTicker(tickerData);
                }
              });
              this.notifyFuturesCallbacks(this.futuresData);
            } else if (message.stream === "ticker" && message.data) {
              // Individual ticker format: {"stream": "ticker", "data": {"symbol": "SYMBOL", ...}}
              const tickerData = message.data;
              if (tickerData.symbol && tickerData.last !== undefined) {
                this.futuresData[tickerData.symbol] = {
                  last: toNum(tickerData.last),
                  change: toNum(tickerData.change),
                  percentage: toNum(tickerData.percentage),
                  baseVolume: toNum(tickerData.baseVolume),
                  quoteVolume: toNum(tickerData.quoteVolume),
                  high: toNum(tickerData.high),
                  low: toNum(tickerData.low),
                  bid: toNum(tickerData.bid),
                  ask: toNum(tickerData.ask),
                  // Only carry a funding rate the feed actually SENT.
                  // `toNum(undefined)` is 0, which turned an absent field into a
                  // published 0.0000% on every futures market — a rate this
                  // exchange neither charges nor pays.
                  ...(tickerData.fundingRate != null
                    ? { fundingRate: toNum(tickerData.fundingRate) }
                    : {}),
                } as TickerData;
                console.log("Updated futures data for", tickerData.symbol, ":", this.futuresData[tickerData.symbol]);
                this.notifyFuturesCallbacks(this.futuresData);
              }
            }
          } catch (error) {
            console.error("Error parsing futures WebSocket message:", error);
          }
        };

        this.futuresWs.onerror = (error) => {
          console.error("Futures WebSocket error:", error);
          this.futuresConnectionState = ConnectionStatus.ERROR;
          this.updateAllConnectionStatus();
          reject(error);
        };

        this.futuresWs.onclose = () => {
          console.log("Futures WebSocket closed");
          this.futuresWs = null;
          this.futuresConnectionState = ConnectionStatus.DISCONNECTED;
          this.futuresConnectionPromise = null;
          this.updateAllConnectionStatus();

          // Only attempt to reconnect if we still have subscribers and we're not in the process of closing
          if (this.futuresSubscriptionCount > 0 && !this.isClosing) {
            // Attempt to reconnect after a delay
            setTimeout(() => {
              this.connectFutures().catch(console.error);
            }, 5000);
          }
        };
      } catch (error) {
        console.error("Error creating futures WebSocket:", error);
        this.futuresConnectionState = ConnectionStatus.ERROR;
        this.updateAllConnectionStatus();
        this.futuresConnectionPromise = null;
        reject(error);
      }
    });

    return this.futuresConnectionPromise;
  }

  // Connect to forex-trading WebSocket
  private connectForex(): Promise<void> {
    // Check if forex_trading extension is available
    if (!isExtensionAvailable("forex_trading")) {
      console.warn("Forex Trading extension not available, skipping forex WebSocket connection");
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.forexConnectionPromise) {
      return this.forexConnectionPromise;
    }

    // If already connected, return resolved promise
    if (
      this.forexWs &&
      this.forexConnectionState === ConnectionStatus.CONNECTED
    ) {
      return Promise.resolve();
    }

    // Create new connection
    this.forexConnectionState = ConnectionStatus.CONNECTING;
    this.updateAllConnectionStatus();

    this.forexConnectionPromise = new Promise<void>((resolve, reject) => {
      const url = this.createWebSocketUrl("api/forex-trading/ticker");

      try {
        this.forexWs = new WebSocket(url);

        this.forexWs.onopen = () => {
          this.forexConnectionState = ConnectionStatus.CONNECTED;
          this.updateAllConnectionStatus();

          if (this.forexWs && this.forexWs.readyState === WebSocket.OPEN) {
            this.forexWs.send(
              JSON.stringify({
                action: "SUBSCRIBE",
                payload: { type: "tickers" },
              })
            );
          }

          resolve();
        };

        this.forexWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.stream === "tickers" && message.data) {
              // Bulk tickers format: {"stream": "tickers", "data": {"SYMBOL": {...}}}
              Object.entries(message.data).forEach(([symbol, tickerData]) => {
                if (tickerData && (tickerData as TickerData).last !== undefined) {
                  this.forexData[symbol] = normalizeTicker(tickerData);
                }
              });
              this.notifyForexCallbacks(this.forexData);
            }
          } catch (error) {
            console.error("Error parsing forex WebSocket message:", error);
          }
        };

        this.forexWs.onerror = (error) => {
          console.error("Forex WebSocket error:", error);
          this.forexConnectionState = ConnectionStatus.ERROR;
          this.updateAllConnectionStatus();
          reject(error);
        };

        this.forexWs.onclose = () => {
          this.forexWs = null;
          this.forexConnectionState = ConnectionStatus.DISCONNECTED;
          this.forexConnectionPromise = null;
          this.updateAllConnectionStatus();

          // Only attempt to reconnect if we still have subscribers and we're not closing
          if (this.forexSubscriptionCount > 0 && !this.isClosing) {
            setTimeout(() => {
              this.connectForex().catch(console.error);
            }, 5000);
          }
        };
      } catch (error) {
        console.error("Error creating forex WebSocket:", error);
        this.forexConnectionState = ConnectionStatus.ERROR;
        this.updateAllConnectionStatus();
        this.forexConnectionPromise = null;
        reject(error);
      }
    });

    return this.forexConnectionPromise;
  }



  // Subscribe to spot data
  public subscribeToSpotData(
    callback: (data: Record<string, TickerData>) => void
  ): () => void {
    // Increment subscription count
    this.spotSubscriptionCount++;

    // Add callback to set
    this.spotCallbacks.add(callback);

    // If we already have data, notify immediately
    if (Object.keys(this.spotData).length > 0) {
      callback(this.spotData);
    }

    // Connect if not already connected
    if (this.spotConnectionState !== ConnectionStatus.CONNECTED) {
      this.connectSpot().catch(console.error);
    }

    // Clear any pending close timeout
    if (this.spotCloseTimeout) {
      clearTimeout(this.spotCloseTimeout);
      this.spotCloseTimeout = null;
    }

    // Return unsubscribe function
    return () => {
      this.spotCallbacks.delete(callback);
      this.spotSubscriptionCount--;

      // If no more subscribers, schedule closing the connection after a delay
      // This prevents rapid subscribe/unsubscribe cycles from breaking connections
      if (this.spotSubscriptionCount === 0 && this.spotWs) {

        // Clear any existing timeout
        if (this.spotCloseTimeout) {
          clearTimeout(this.spotCloseTimeout);
        }

        // Set a new timeout to close the connection after a delay
        this.spotCloseTimeout = setTimeout(() => {
          if (this.spotWs) {
            this.spotWs.close();
            this.spotWs = null;
          }
          this.spotCloseTimeout = null;
        }, 5000); // 5 second delay before closing
      }
    };
  }

  // Subscribe to eco data
  public subscribeToEcoData(
    callback: (data: Record<string, TickerData>) => void
  ): () => void {
    // Check if ecosystem extension is available
    if (!isExtensionAvailable("ecosystem")) {
      console.warn("Ecosystem extension not available, skipping eco data subscription");
      // Return a no-op unsubscribe function
      return () => {};
    }

    // Increment subscription count
    this.ecoSubscriptionCount++;

    // Add callback to set
    this.ecoCallbacks.add(callback);

    // If we already have data, notify immediately
    if (Object.keys(this.ecoData).length > 0) {
      callback(this.ecoData);
    }

    // Connect if not already connected
    if (this.ecoConnectionState !== ConnectionStatus.CONNECTED) {
      this.connectEco().catch(console.error);
    }

    // Clear any pending close timeout
    if (this.ecoCloseTimeout) {
      clearTimeout(this.ecoCloseTimeout);
      this.ecoCloseTimeout = null;
    }

    // Return unsubscribe function
    return () => {
      this.ecoCallbacks.delete(callback);
      this.ecoSubscriptionCount--;

      // If no more subscribers, schedule closing the connection after a delay
      if (this.ecoSubscriptionCount === 0 && this.ecoWs) {

        // Clear any existing timeout
        if (this.ecoCloseTimeout) {
          clearTimeout(this.ecoCloseTimeout);
        }

        // Set a new timeout to close the connection after a delay
        this.ecoCloseTimeout = setTimeout(() => {
          if (this.ecoWs) {
            this.ecoWs.close();
            this.ecoWs = null;
          }
          this.ecoCloseTimeout = null;
        }, 5000); // 5 second delay before closing
      }
    };
  }

  // Subscribe to futures data
  public subscribeToFuturesData(
    callback: (data: Record<string, TickerData>) => void
  ): () => void {
    // Check if futures extension is available
    if (!isExtensionAvailable("futures")) {
      console.warn("Futures extension not available, skipping futures data subscription");
      // Return a no-op unsubscribe function
      return () => {};
    }

    // Increment subscription count
    this.futuresSubscriptionCount++;

    // Add callback to set
    this.futuresCallbacks.add(callback);

    // If we already have data, notify immediately
    if (Object.keys(this.futuresData).length > 0) {
      callback(this.futuresData);
    }

    // Connect to futures bulk ticker WebSocket if not already connected
    if (this.futuresConnectionState !== ConnectionStatus.CONNECTED) {
      this.connectFutures().catch(console.error);
    }

    // Clear any pending close timeout
    if (this.futuresCloseTimeout) {
      clearTimeout(this.futuresCloseTimeout);
      this.futuresCloseTimeout = null;
    }

    // Return unsubscribe function
    return () => {
      this.futuresCallbacks.delete(callback);
      this.futuresSubscriptionCount--;

      // If no more subscribers, schedule closing the connection after a delay
      if (this.futuresSubscriptionCount === 0 && this.futuresWs) {

        // Clear any existing timeout
        if (this.futuresCloseTimeout) {
          clearTimeout(this.futuresCloseTimeout);
        }

        // Set a new timeout to close the connection after a delay
        this.futuresCloseTimeout = setTimeout(() => {
          if (this.futuresWs) {
            this.futuresWs.close();
            this.futuresWs = null;
          }
          this.futuresCloseTimeout = null;
        }, 5000); // 5 second delay before closing
      }
    };
  }

  // Subscribe to forex data
  public subscribeToForexData(
    callback: (data: Record<string, TickerData>) => void
  ): () => void {
    // Check if forex_trading extension is available
    if (!isExtensionAvailable("forex_trading")) {
      console.warn("Forex Trading extension not available, skipping forex data subscription");
      // Return a no-op unsubscribe function
      return () => {};
    }

    // Increment subscription count
    this.forexSubscriptionCount++;

    // Add callback to set
    this.forexCallbacks.add(callback);

    // If we already have data, notify immediately
    if (Object.keys(this.forexData).length > 0) {
      callback(this.forexData);
    }

    // Connect to forex bulk ticker WebSocket if not already connected
    if (this.forexConnectionState !== ConnectionStatus.CONNECTED) {
      this.connectForex().catch(console.error);
    }

    // Clear any pending close timeout
    if (this.forexCloseTimeout) {
      clearTimeout(this.forexCloseTimeout);
      this.forexCloseTimeout = null;
    }

    // Return unsubscribe function
    return () => {
      this.forexCallbacks.delete(callback);
      this.forexSubscriptionCount--;

      // If no more subscribers, schedule closing the connection after a delay
      if (this.forexSubscriptionCount === 0 && this.forexWs) {
        if (this.forexCloseTimeout) {
          clearTimeout(this.forexCloseTimeout);
        }
        this.forexCloseTimeout = setTimeout(() => {
          if (this.forexWs) {
            this.forexWs.close();
            this.forexWs = null;
          }
          this.forexCloseTimeout = null;
        }, 5000); // 5 second delay before closing
      }
    };
  }

  // Subscribe to connection status
  public subscribeToConnectionStatus(
    callback: (status: ConnectionStatus) => void
  ): () => void {
    this.connectionStatusCallbacks.add(callback);

    // Notify immediately with current status
    callback(this.getConnectionStatus());

    return () => {
      this.connectionStatusCallbacks.delete(callback);
    };
  }

  // Notify spot callbacks
  private notifySpotCallbacks(data: Record<string, TickerData>): void {
    this.spotCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in spot callback:", error);
      }
    });
  }

  // Notify eco callbacks
  private notifyEcoCallbacks(data: Record<string, TickerData>): void {
    this.ecoCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in eco callback:", error);
      }
    });
  }

  // Notify futures callbacks
  private notifyFuturesCallbacks(data: Record<string, TickerData>): void {
    this.futuresCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in futures callback:", error);
      }
    });
  }

  // Notify forex callbacks
  private notifyForexCallbacks(data: Record<string, TickerData>): void {
    this.forexCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in forex callback:", error);
      }
    });
  }

  // Update all connection status callbacks
  private updateAllConnectionStatus(): void {
    const status = this.getConnectionStatus();
    this.connectionStatusCallbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (error) {
        console.error("Error in connection status callback:", error);
      }
    });
  }

  /**
   * Drop a symbol's cached ticker from all three feeds.
   *
   * LOCAL ONLY — the sockets themselves keep running, because each carries one
   * bulk `{"type":"tickers"}` stream and there is no per-symbol subscription to
   * cancel. See the note at the end of the body. Callers use this when
   * navigating between pages so a stale last-price cannot be replayed to the
   * next screen.
   *
   * @param symbol The symbol to forget
   */
  public unsubscribeFromSymbol(symbol: string): void {
    // Normalize the symbol to handle different formats
    const normalizedSymbol = symbol.replace('/', '').replace('-', '').toUpperCase();
    const slashSymbol = symbol.includes('/') ? symbol : symbol.replace(/([A-Z]+)([A-Z]{3,4})$/, '$1/$2');
    const dashSymbol = symbol.includes('-') ? symbol : symbol.replace(/([A-Z]+)([A-Z]{3,4})$/, '$1-$2');
    
    // Create an array of possible symbol formats to check
    const symbolVariations = [
      symbol,
      normalizedSymbol,
      slashSymbol,
      dashSymbol,
      symbol.toUpperCase(),
      symbol.toLowerCase(),
    ];
    
    // Check if we have this symbol in any of our data caches
    const hasInSpot = symbolVariations.some(s => this.spotData[s] !== undefined);
    const hasInEco = symbolVariations.some(s => this.ecoData[s] !== undefined);
    const hasInFutures = symbolVariations.some(s => this.futuresData[s] !== undefined);
    
    console.log(`Unsubscribing from symbol: ${symbol} (found in spot: ${hasInSpot}, eco: ${hasInEco}, futures: ${hasInFutures})`);
    
    // Remove the symbol from our data caches
    symbolVariations.forEach(s => {
      delete this.spotData[s];
      delete this.ecoData[s];
      delete this.futuresData[s];
    });
    
    /*
      DROPPING THE SYMBOL FROM THE CACHES IS THE WHOLE OPERATION. THERE IS NO
      PER-SYMBOL UNSUBSCRIBE TO SEND, AND THERE NEVER WAS.

      Each of these three sockets carries ONE bulk stream. The only SUBSCRIBE
      this service ever sends on them is `{"type":"tickers"}` (see the three
      `onopen` handlers above), and every ticker route answers only that:
      `exchange/ticker/index.ws.ts:414` and `forex-trading/ticker/index.ws.ts:33`
      both return early on an UNSUBSCRIBE, and the ecosystem and futures ticker
      routes have no subscription handling at all — they broadcast the whole
      ticker map on any inbound frame.

      This used to send `{action:"UNSUBSCRIBE", payload:{type:"ticker", symbol}}`
      on all three. `Websocket.ts` removes a subscription by
      `JSON.stringify(payload)` equality, and no client has ever registered that
      key, so `removeClientSubscription` deleted nothing — three frames per
      navigation that could not do the thing their name claims. On the ecosystem
      and futures routes they were worse than inert: those handlers run
      `engine.getTickers()` and broadcast on ANY message, so each one bought a
      full ticker fan-out in exchange for nothing.

      If per-symbol ticker subscriptions are ever wanted, they need a route that
      registers them — adding the frame back on this side alone would put the
      code straight back where it was.
    */
  }

  public cleanup(): void {
    this.isClosing = true;

    // Clear all timeouts
    if (this.spotCloseTimeout) {
      clearTimeout(this.spotCloseTimeout);
      this.spotCloseTimeout = null;
    }

    if (this.ecoCloseTimeout) {
      clearTimeout(this.ecoCloseTimeout);
      this.ecoCloseTimeout = null;
    }

    if (this.futuresCloseTimeout) {
      clearTimeout(this.futuresCloseTimeout);
      this.futuresCloseTimeout = null;
    }

    if (this.forexCloseTimeout) {
      clearTimeout(this.forexCloseTimeout);
      this.forexCloseTimeout = null;
    }



    // Close all WebSocket connections
    if (this.spotWs) {
      this.spotWs.close();
      this.spotWs = null;
    }

    if (this.ecoWs) {
      this.ecoWs.close();
      this.ecoWs = null;
    }

    if (this.futuresWs) {
      this.futuresWs.close();
      this.futuresWs = null;
    }

    if (this.forexWs) {
      this.forexWs.close();
      this.forexWs = null;
    }



    // Reset all state
    this.spotConnectionState = ConnectionStatus.DISCONNECTED;
    this.ecoConnectionState = ConnectionStatus.DISCONNECTED;
    this.futuresConnectionState = ConnectionStatus.DISCONNECTED;
    this.forexConnectionState = ConnectionStatus.DISCONNECTED;

    this.spotSubscriptionCount = 0;
    this.ecoSubscriptionCount = 0;
    this.futuresSubscriptionCount = 0;
    this.forexSubscriptionCount = 0;

    this.spotCallbacks.clear();
    this.ecoCallbacks.clear();
    this.futuresCallbacks.clear();
    this.forexCallbacks.clear();
    this.connectionStatusCallbacks.clear();

    this.spotConnectionPromise = null;
    this.ecoConnectionPromise = null;
    this.futuresConnectionPromise = null;
    this.forexConnectionPromise = null;

    this.isInitialized = false;
    this.isClosing = false;
  }
}

// Export the singleton instance
export const tickersWs = TickersWebSocketManager.getInstance();
