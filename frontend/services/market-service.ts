import { isExtensionAvailable } from "@/lib/extensions";

// Market data service to centralize market data fetching and sharing
class MarketService {
  private static instance: MarketService;

  // Market data cache
  private spotMarkets: any[] = [];
  private futuresMarkets: any[] = [];
  private ecoMarkets: any[] = [];

  // Loading states
  private isLoadingSpot = false;
  private isLoadingFutures = false;
  private isLoadingEco = false;

  // Data fetched flags
  private spotDataFetched = false;
  private futuresDataFetched = false;
  private ecoDataFetched = false;

  // Subscribers for data updates
  private spotSubscribers: Set<(markets: any[]) => void> = new Set();
  private futuresSubscribers: Set<(markets: any[]) => void> = new Set();
  private ecoSubscribers: Set<(markets: any[]) => void> = new Set();

  // Promises to prevent duplicate fetches
  private spotPromise: Promise<any[]> | null = null;
  private futuresPromise: Promise<any[]> | null = null;
  private ecoPromise: Promise<any[]> | null = null;

  private constructor() {}

  public static getInstance(): MarketService {
    if (!MarketService.instance) {
      MarketService.instance = new MarketService();
    }
    return MarketService.instance;
  }

  // Fetch spot markets
  public async getSpotMarkets(): Promise<any[]> {
    // Return cached data if already fetched
    if (this.spotDataFetched) {
      return this.spotMarkets;
    }

    // Return existing promise if already fetching
    if (this.spotPromise) {
      return this.spotPromise;
    }

    // Start fetching
    this.isLoadingSpot = true;
    this.spotPromise = this.fetchSpotMarkets();

    try {
      const markets = await this.spotPromise;
      this.spotMarkets = markets;
      this.spotDataFetched = true;
      this.notifySpotSubscribers();
      return markets;
    } finally {
      this.isLoadingSpot = false;
      this.spotPromise = null;
    }
  }

  // Fetch futures markets
  public async getFuturesMarkets(): Promise<any[]> {
    // Check if futures extension is available
    if (!isExtensionAvailable("futures")) {
      return [];
    }

    // Return cached data if already fetched
    if (this.futuresDataFetched) {
      return this.futuresMarkets;
    }

    // Return existing promise if already fetching
    if (this.futuresPromise) {
      return this.futuresPromise;
    }

    // Start fetching
    this.isLoadingFutures = true;
    this.futuresPromise = this.fetchFuturesMarkets();

    try {
      const markets = await this.futuresPromise;
      this.futuresMarkets = markets;
      this.futuresDataFetched = true;
      this.notifyFuturesSubscribers();
      return markets;
    } finally {
      this.isLoadingFutures = false;
      this.futuresPromise = null;
    }
  }

  // Subscribe to spot market updates
  public subscribeToSpotMarkets(
    callback: (markets: any[]) => void
  ): () => void {
    this.spotSubscribers.add(callback);

    // Immediately call with current data if available
    if (this.spotDataFetched) {
      callback(this.spotMarkets);
    }

    return () => {
      this.spotSubscribers.delete(callback);
    };
  }

  // Subscribe to futures market updates
  public subscribeToFuturesMarkets(
    callback: (markets: any[]) => void
  ): () => void {
    this.futuresSubscribers.add(callback);

    // Immediately call with current data if available
    if (this.futuresDataFetched) {
      callback(this.futuresMarkets);
    }

    return () => {
      this.futuresSubscribers.delete(callback);
    };
  }

  // Get cached spot markets without fetching
  public getCachedSpotMarkets(): any[] {
    return this.spotMarkets;
  }

  // Get cached futures markets without fetching
  public getCachedFuturesMarkets(): any[] {
    return this.futuresMarkets;
  }

  // Check if spot markets are loading
  public isSpotMarketsLoading(): boolean {
    return this.isLoadingSpot;
  }

  // Check if futures markets are loading
  public isFuturesMarketsLoading(): boolean {
    return this.isLoadingFutures;
  }

  // Private method to fetch spot markets from API
  private async fetchSpotMarkets(): Promise<any[]> {
    try {
      // Include ecosystem markets in the request
      const response = await fetch("/api/exchange/market?eco=true");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch spot markets: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        // Process and deduplicate markets, prioritizing ecosystem markets
        const processedMarkets = data.map((market) => ({
          ...market,
          displaySymbol: market.symbol || `${market.currency}/${market.pair}`,
          // Use symbol from API if available, otherwise construct it
          symbol: market.symbol || `${market.currency}/${market.pair}`,
          metadata: market.metadata || { precision: { price: 2, amount: 2 } },
        }));

        // Deduplicate markets: ecosystem markets take priority over spot markets
        const marketMap = new Map<string, any>();
        
        // First pass: add all spot markets (non-eco)
        const spotMarkets = processedMarkets.filter(market => !market.isEco);
        const ecoMarkets = processedMarkets.filter(market => market.isEco);
        
        spotMarkets.forEach(market => {
          marketMap.set(market.symbol, market);
        });
        
        // Second pass: add ecosystem markets, overwriting any existing spot markets with same symbol
        const overriddenSymbols: string[] = [];
        ecoMarkets.forEach(market => {
          if (marketMap.has(market.symbol)) {
            overriddenSymbols.push(market.symbol);
          }
          marketMap.set(market.symbol, market);
        });

        // Convert back to array and sort by symbol for consistent ordering
        const deduplicatedMarkets = Array.from(marketMap.values())
          .sort((a, b) => a.symbol.localeCompare(b.symbol));

        
        return deduplicatedMarkets;
      }

      return [];
    } catch (error) {
      console.error("Error fetching spot markets:", error);
      return [];
    }
  }

  // Private method to fetch futures markets from API
  private async fetchFuturesMarkets(): Promise<any[]> {
    try {
      const response = await fetch("/api/futures/market");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch futures markets: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Handle direct array response (like spot markets)
      if (Array.isArray(data)) {
        return data.map((market) => ({
          ...market,
          displaySymbol: market.symbol || `${market.currency}/${market.pair}`,
          // Use symbol from API if available, otherwise construct it
          symbol: market.symbol || `${market.currency}/${market.pair}`,
        }));
      }

      // Fallback: handle wrapped response format
      if (data.success && Array.isArray(data.data)) {
        return data.data;
      }

      return [];
    } catch (error) {
      console.error("Error fetching futures markets:", error);
      return [];
    }
  }

  // Notify spot market subscribers
  private notifySpotSubscribers(): void {
    this.spotSubscribers.forEach((callback) => {
      try {
        callback(this.spotMarkets);
      } catch (error) {
        console.error("Error in spot market subscriber:", error);
      }
    });
  }

  // Notify futures market subscribers
  private notifyFuturesSubscribers(): void {
    this.futuresSubscribers.forEach((callback) => {
      try {
        callback(this.futuresMarkets);
      } catch (error) {
        console.error("Error in futures market subscriber:", error);
      }
    });
  }

  // Initialize all market data (called once on app load)
  public async initialize(): Promise<void> {

    try {
      const promises = [this.getSpotMarkets()];
      
      // Only fetch futures markets if the extension is available
      if (isExtensionAvailable("futures")) {
        promises.push(this.getFuturesMarkets());
      }
      
      await Promise.all(promises);

    } catch (error) {
      console.error("Error initializing market service:", error);
    }
  }

  // Clear cache and reset state (useful for testing)
  public reset(): void {
    this.spotMarkets = [];
    this.futuresMarkets = [];
    this.ecoMarkets = [];
    this.spotDataFetched = false;
    this.futuresDataFetched = false;
    this.ecoDataFetched = false;
    this.isLoadingSpot = false;
    this.isLoadingFutures = false;
    this.isLoadingEco = false;
    this.spotPromise = null;
    this.futuresPromise = null;
    this.ecoPromise = null;
  }
}

// Export singleton instance
export const marketService = MarketService.getInstance();
