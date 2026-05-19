type WishlistItem = {
  symbol: string;
  addedAt: number;
  marketType: "spot" | "futures"; // Add market type to distinguish between spot and futures
};

type WishlistSubscriber = (items: WishlistItem[]) => void;

class WishlistService {
  private items: WishlistItem[] = [];
  private subscribers: WishlistSubscriber[] = [];
  private storageKey = "trading-watchlist";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsedItems = JSON.parse(stored);

          // Handle migration from old format (without marketType)
          this.items = parsedItems.map((item: any) => {
            if (!item.marketType) {
              return { ...item, marketType: "spot" };
            }
            return item;
          });

          this.notifySubscribers();
        }
      } catch (error) {
        console.error("Failed to load watchlist from storage:", error);
      }
    }
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
      } catch (error) {
        console.error("Failed to save watchlist to storage:", error);
      }
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach((subscriber) => subscriber([...this.items]));
  }

  public subscribe(callback: WishlistSubscriber): () => void {
    this.subscribers.push(callback);
    callback([...this.items]);

    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  }

  public toggleWishlist(
    symbol: string,
    marketType: "spot" | "futures" = "spot"
  ) {
    // Find the item with matching symbol AND market type
    const index = this.items.findIndex(
      (item) => item.symbol === symbol && item.marketType === marketType
    );

    if (index >= 0) {
      this.items.splice(index, 1);
    } else {
      this.items.push({
        symbol,
        addedAt: Date.now(),
        marketType,
      });
    }

    this.saveToStorage();
    this.notifySubscribers();
  }

  public isInWishlist(
    symbol: string,
    marketType: "spot" | "futures" = "spot"
  ): boolean {
    return this.items.some(
      (item) => item.symbol === symbol && item.marketType === marketType
    );
  }

  public getWishlist(): WishlistItem[] {
    return [...this.items];
  }

  public clearWishlist() {
    this.items = [];
    this.saveToStorage();
    this.notifySubscribers();
  }
}

export const wishlistService = new WishlistService();
