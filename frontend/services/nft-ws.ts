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
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;

    try {
      const wsUrl = this.createWebSocketUrl("api/nft/market");
      wsManager.connect(wsUrl, "nftMarket");
      wsManager.subscribe(
        "default",
        this.handleMessage.bind(this),
        "nftMarket"
      );
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize NFT WebSocket:", error);
    }
  }

  private createWebSocketUrl(path: string): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/${path}`;
  }

  private handleMessage(data: any): void {
    try {
      if (data && typeof data === "object" && data.data) {
        const { type, data: messageData } = data.data;
        
        // Broadcast to all relevant subscribers
        this.callbacks.forEach((callbackSet, subscriptionKey) => {
          if (this.shouldReceiveUpdate(subscriptionKey, type, messageData)) {
            callbackSet.forEach((callback) => {
              try {
                callback({ type, data: messageData });
              } catch (error) {
                console.error("Error in NFT callback:", error);
              }
            });
          }
        });
      }
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
    
    // Initialize callbacks set if not exists
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set());
    }
    
    this.callbacks.get(subscriptionKey)!.add(callback);

    // Auto-initialize on first subscription
    if (!this.isInitialized) {
      this.initialize();
    }

    // Send subscription message to backend
    this.sendSubscriptionMessage(subscription);

    // Return unsubscribe function
    return () => {
      const callbackSet = this.callbacks.get(subscriptionKey);
      if (callbackSet) {
        callbackSet.delete(callback);
        if (callbackSet.size === 0) {
          this.callbacks.delete(subscriptionKey);
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
    const message = {
      action: "SUBSCRIBE",
      payload: {
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
    const message = {
      action: "UNSUBSCRIBE",
      payload: {
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