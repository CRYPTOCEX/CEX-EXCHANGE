"use client";

import { wsManager, ConnectionStatus } from "./ws-manager";

// Types for binary order updates
export interface BinaryOrderUpdate {
  id: string;
  status: "success" | "failure" | "completed" | "win" | "loss";
  profit?: number;
  closePrice?: number;
  message?: string;
}

export type BinaryOrderCallback = (data: BinaryOrderUpdate) => void;

class BinaryOrderWebSocket {
  private callbacks: Set<BinaryOrderCallback> = new Set();
  private isInitialized = false;

  public initialize(): void {
    if (this.isInitialized) return;

    try {
      wsManager.connect("api/exchange/binary/order", "binaryOrder");
      wsManager.subscribe(
        "default",
        this.handleMessage.bind(this),
        "binaryOrder"
      );
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize binary order WebSocket:", error);
    }
  }

  private handleMessage(data: any): void {
    try {
      // Handle different types of binary order updates
      if (data && typeof data === "object") {
        this.callbacks.forEach((callback) => {
          try {
            callback(data as BinaryOrderUpdate);
          } catch (error) {
            console.error("Error in binary order callback:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error handling binary order message:", error);
    }
  }

  public subscribe(callback: BinaryOrderCallback): () => void {
    this.callbacks.add(callback);

    // Auto-initialize on first subscription
    if (!this.isInitialized) {
      this.initialize();
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public getConnectionStatus(): ConnectionStatus {
    return wsManager.getStatus("binaryOrder");
  }

  public disconnect(): void {
    wsManager.close("binaryOrder");
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

// Export a singleton instance
export const binaryOrderWs = new BinaryOrderWebSocket();
