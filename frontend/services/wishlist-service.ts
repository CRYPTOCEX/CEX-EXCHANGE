import { $fetch } from "@/lib/api";

type MarketType = "spot" | "eco" | "futures";

type WishlistItem = {
  symbol: string;
  addedAt: number;
  marketType: MarketType; // a spot and a futures market can share a symbol
};

type WishlistSubscriber = (items: WishlistItem[]) => void;

/**
 * The trading watchlist.
 *
 * This used to be localStorage ONLY: `/api/exchange/watchlist` existed, stored
 * per-user rows and was never called by anything, so a user's starred markets
 * vanished when they changed device or cleared their browser — and the server
 * table sat permanently empty. It now syncs:
 *
 *   - localStorage stays the immediate source of truth, so the star reacts at
 *     once and a signed-out visitor still gets a working watchlist;
 *   - a signed-in user's stars are mirrored to the server and merged back on
 *     load, which is what makes them survive a new device.
 *
 * Sync failures are deliberately silent (`silent: true`) and never block the UI:
 * a watchlist is a convenience, and an unauthenticated visitor toggling a star
 * must not be shown a session error.
 */
class WishlistService {
  private items: WishlistItem[] = [];
  private subscribers: WishlistSubscriber[] = [];
  private storageKey = "trading-watchlist";
  private synced = false;
  private syncing: Promise<void> | null = null;

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

    // First subscriber pulls the server copy. Deliberately after the immediate
    // callback so the UI paints from localStorage without waiting on a request.
    void this.syncFromServer();

    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  }

  /**
   * Merge the server's rows into the local list (union, local wins on ties).
   *
   * A union rather than a replace: the local list may hold stars made while
   * signed out, and those are the user's too. Anything local that the server
   * does not know about is pushed up.
   */
  public async syncFromServer(force = false): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.synced && !force) return;
    if (this.syncing) return this.syncing;

    this.syncing = (async () => {
      const { data, error } = await $fetch<
        Array<{ symbol: string; type?: string }>
      >({
        url: "/api/exchange/watchlist",
        silent: true,
      });
      // A signed-out visitor gets an error here, which is not a problem: the
      // local watchlist keeps working and nothing is pushed up.
      if (error || !Array.isArray(data)) {
        this.synced = true;
        return;
      }

      const remote = data.map((row) => ({
        symbol: row.symbol,
        marketType: (String(row.type || "spot").toLowerCase() as MarketType) || "spot",
      }));

      const key = (symbol: string, marketType: MarketType) => `${marketType}:${symbol}`;
      const localKeys = new Set(this.items.map((i) => key(i.symbol, i.marketType)));

      let changed = false;
      for (const row of remote) {
        if (!localKeys.has(key(row.symbol, row.marketType))) {
          this.items.push({ symbol: row.symbol, marketType: row.marketType, addedAt: Date.now() });
          changed = true;
        }
      }

      const remoteKeys = new Set(remote.map((r) => key(r.symbol, r.marketType)));
      const onlyLocal = this.items.filter((i) => !remoteKeys.has(key(i.symbol, i.marketType)));

      this.synced = true;
      if (changed) {
        this.saveToStorage();
        this.notifySubscribers();
      }

      // Push up anything the server has not seen (stars made while signed out).
      for (const item of onlyLocal) {
        await this.pushToServer(item.symbol, item.marketType, true);
      }
    })();

    try {
      await this.syncing;
    } finally {
      this.syncing = null;
    }
  }

  /**
   * Mirror one entry to the server.
   *
   * The endpoint is a toggle, so it cannot be used to assert a desired state —
   * `watching` in the response says what actually happened, and a mismatch means
   * the server was already in the state we wanted, which is fine either way.
   */
  private async pushToServer(
    symbol: string,
    marketType: MarketType,
    watching: boolean
  ): Promise<void> {
    if (watching) {
      await $fetch({
        url: "/api/exchange/watchlist",
        method: "POST",
        body: { symbol, type: marketType.toUpperCase() },
        silent: true,
      });
      return;
    }
    await $fetch({
      url: "/api/exchange/watchlist",
      method: "DELETE",
      body: { symbol, type: marketType.toUpperCase() },
      silent: true,
    });
  }

  public toggleWishlist(symbol: string, marketType: MarketType = "spot") {
    // Find the item with matching symbol AND market type
    const index = this.items.findIndex(
      (item) => item.symbol === symbol && item.marketType === marketType
    );

    const nowWatching = index < 0;
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
    void this.pushToServer(symbol, marketType, nowWatching);
  }

  public isInWishlist(symbol: string, marketType: MarketType = "spot"): boolean {
    return this.items.some(
      (item) => item.symbol === symbol && item.marketType === marketType
    );
  }

  public getWishlist(): WishlistItem[] {
    return [...this.items];
  }

  public clearWishlist() {
    const previous = this.items;
    this.items = [];
    this.saveToStorage();
    this.notifySubscribers();
    for (const item of previous) {
      void this.pushToServer(item.symbol, item.marketType, false);
    }
  }
}

export const wishlistService = new WishlistService();
