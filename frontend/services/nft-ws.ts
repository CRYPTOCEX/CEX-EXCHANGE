import { wsManager } from "@/services/ws-manager";

interface NFTSubscription {
  type: "auction" | "token" | "collection" | "activity" | "bids";
  tokenId?: string;
  collectionId?: string;
  auctionId?: string;
  userId?: string;
}

type NFTUpdateCallback = (data: any) => void;

class NFTWebSocketService {
  private callbacks: Map<string, Set<NFTUpdateCallback>> = new Map();
  /** The ws-manager handler registered for each subscription key, for teardown. */
  private streamHandlers: Map<string, (frame: any) => void> = new Map();
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;

    try {
      const wsUrl = this.createWebSocketUrl("api/nft/market");
      wsManager.connect(wsUrl, "nftMarket");
      /*
       * NO HANDLER IS REGISTERED HERE, and that is the fix rather than an
       * omission. `ws-manager` routes an incoming frame by its `stream` field,
       * and this route stamps every frame with the SUBSCRIPTION KEY
       * ("token:123", "auction:9"). A handler registered on "default" matched
       * nothing the server has ever sent, so the manager dropped every NFT
       * frame before it reached this service. Handlers are registered per key
       * in `subscribe()` below, against the key the server will stamp.
       */
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize NFT WebSocket:", error);
    }
  }

  private createWebSocketUrl(path: string): string {
    // All backends now use /api/ prefix
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
    const host = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
    return `${protocol}//${host}/${path}`;
  }

  /**
   * One stream's frames, already unwrapped by the manager.
   *
   * `ws-manager` delivers `data.data || data` — the INNER value of the
   * `{stream, data}` envelope. This method used to read `data.data` again and
   * destructure `{type}` off it, one level too deep, so `type` was undefined
   * for every frame that did reach it and no callback ever fired. What the
   * route sends is `{type, data}`, and that is what arrives here.
   */
  private handleMessage(subscriptionKey: string, frame: any): void {
    try {
      if (!frame || typeof frame !== "object") return;
      const { type, data: messageData } = frame;
      if (!type) return;

      const callbackSet = this.callbacks.get(subscriptionKey);
      if (!callbackSet) return;
      if (!this.shouldReceiveUpdate(subscriptionKey, type, messageData)) return;

      callbackSet.forEach((callback) => {
        try {
          callback({ type, data: messageData });
        } catch (error) {
          console.error("Error in NFT callback:", error);
        }
      });
    } catch (error) {
      console.error("Error handling NFT message:", error);
    }
  }

  private shouldReceiveUpdate(subscriptionKey: string, messageType: string, messageData: any): boolean {
    const [subType, subId] = subscriptionKey.split(":");
    
    switch (messageType) {
      case "auction_update":
      case "auction_ended":
        return (subType === "auction" && subId === messageData.data?.id) ||
               (subType === "token" && subId === messageData.data?.tokenId);
      
      case "token_update":
        return subType === "token" && subId === messageData.data?.id;
      
      case "collection_update":
        return subType === "collection" && subId === messageData.data?.id;
      
      case "bids_update":
        return (subType === "bids" && (subId === messageData.data?.[0]?.listingId || subId === messageData.data?.[0]?.tokenId)) ||
               (subType === "auction" && subId === messageData.data?.[0]?.listingId);
      
      case "activity_update":
        return subType === "activity" && (subId === "global" || subId === messageData.data?.[0]?.userId);
      
      default:
        return false;
    }
  }

  public subscribe(subscription: NFTSubscription, callback: NFTUpdateCallback): () => void {
    const subscriptionKey = this.getSubscriptionKey(subscription);

    // Auto-initialize on first subscription
    if (!this.isInitialized) {
      this.initialize();
    }

    // Initialize callbacks set if not exists
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set());
      /*
       * The manager handler is registered against the stream the server
       * stamps, which is the subscription key itself. One handler per key,
       * with the key bound, so a frame reaches the callbacks that asked for it
       * without re-deriving the key from the payload.
       */
      const streamHandler = (frame: any) => this.handleMessage(subscriptionKey, frame);
      this.streamHandlers.set(subscriptionKey, streamHandler);
      wsManager.subscribe(subscriptionKey, streamHandler, "nftMarket");
    }

    this.callbacks.get(subscriptionKey)!.add(callback);

    // Send subscription message to backend
    this.sendSubscriptionMessage(subscription);

    // Return unsubscribe function
    return () => {
      const callbackSet = this.callbacks.get(subscriptionKey);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          this.callbacks.delete(subscriptionKey);
          const handler = this.streamHandlers.get(subscriptionKey);
          if (handler) {
            wsManager.unsubscribe(subscriptionKey, handler, "nftMarket");
            this.streamHandlers.delete(subscriptionKey);
          }
          this.sendUnsubscriptionMessage(subscription);
        }
      }
    };
  }

  private getSubscriptionKey(subscription: NFTSubscription): string {
    const { type, tokenId, collectionId, auctionId, userId } = subscription;
    switch (type) {
      case "auction":
        return `auction:${auctionId || tokenId}`;
      case "token":
        return `token:${tokenId}`;
      case "collection":
        return `collection:${collectionId}`;
      case "activity":
        return `activity:${userId || "global"}`;
      case "bids":
        return `bids:${auctionId || tokenId}`;
      default:
        return `${type}:${tokenId || collectionId || userId || "global"}`;
    }
  }

  private sendSubscriptionMessage(subscription: NFTSubscription): void {
    /*
     * THE PAYLOAD IS THE MATCH KEY, so it has to be what the server broadcasts
     * with. The broker compares a client's subscription payload against the
     * payload a broadcast names, and this route broadcasts
     * `{ subscription: "token:123" }`. Sending the raw `{type, tokenId, ...}`
     * fields — which is what this did — could never match, so every NFT market
     * update reached nobody: subscribes succeeded, broadcasts returned
     * normally, and the zero-match was a DEBUG line.
     *
     * The route's own handler still gets the fields it reads: they travel
     * beside the payload under `filter`.
     */
    const message = {
      action: "SUBSCRIBE",
      payload: { subscription: this.getSubscriptionKey(subscription) },
      filter: {
        type: subscription.type,
        tokenId: subscription.tokenId,
        collectionId: subscription.collectionId,
        auctionId: subscription.auctionId,
        userId: subscription.userId,
      },
    };

    console.log("Sending NFT subscription message:", message);
    wsManager.sendMessage(message, "nftMarket");
  }

  private sendUnsubscriptionMessage(subscription: NFTSubscription): void {
    /*
     * THE PAYLOAD IS THE MATCH KEY, so it has to be what the server broadcasts
     * with. The broker compares a client's subscription payload against the
     * payload a broadcast names, and this route broadcasts
     * `{ subscription: "token:123" }`. Sending the raw `{type, tokenId, ...}`
     * fields — which is what this did — could never match, so every NFT market
     * update reached nobody: subscribes succeeded, broadcasts returned
     * normally, and the zero-match was a DEBUG line.
     *
     * The route's own handler still gets the fields it reads: they travel
     * beside the payload under `filter`.
     */
    const message = {
      action: "UNSUBSCRIBE",
      payload: { subscription: this.getSubscriptionKey(subscription) },
      filter: {
        type: subscription.type,
        tokenId: subscription.tokenId,
        collectionId: subscription.collectionId,
        auctionId: subscription.auctionId,
        userId: subscription.userId,
      },
    };

    wsManager.sendMessage(message, "nftMarket");
  }

  // Convenience methods for common subscriptions
  public subscribeToAuction(auctionId: string, callback: NFTUpdateCallback): () => void {
    return this.subscribe({ type: "auction", auctionId }, callback);
  }

  public subscribeToToken(tokenId: string, callback: NFTUpdateCallback): () => void {
    return this.subscribe({ type: "token", tokenId }, callback);
  }

  public subscribeToCollection(collectionId: string, callback: NFTUpdateCallback): () => void {
    return this.subscribe({ type: "collection", collectionId }, callback);
  }

  public subscribeToBids(tokenId: string, callback: NFTUpdateCallback): () => void {
    return this.subscribe({ type: "bids", tokenId }, callback);
  }

  public subscribeToActivity(callback: NFTUpdateCallback, userId?: string): () => void {
    return this.subscribe({ type: "activity", userId }, callback);
  }

  public getConnectionStatus() {
    return wsManager.getStatus("nftMarket");
  }

  public disconnect(): void {
    wsManager.close("nftMarket");
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const nftWebSocketService = new NFTWebSocketService(); 