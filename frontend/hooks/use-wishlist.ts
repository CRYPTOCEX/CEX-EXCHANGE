"use client";

import { wishlistService } from "@/services/wishlist-service";
import { useState, useEffect } from "react";

// Define a type for the watchlist item with market type
type WishlistItem = {
  symbol: string;
  marketType: "spot" | "futures";
};

export default function useWishlist() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Subscribe to wishlistService changes
  useEffect(() => {
    const unsubscribe = wishlistService.subscribe((items) => {
      setWishlist(
        items.map((item) => ({
          symbol: item.symbol,
          marketType: item.marketType,
        }))
      );
    });

    return () => unsubscribe();
  }, []);

  // Add item to wishlist
  const addToWishlist = (
    symbol: string,
    marketType: "spot" | "futures" = "spot"
  ) => {
    wishlistService.toggleWishlist(symbol, marketType);
  };

  // Remove item from wishlist
  const removeFromWishlist = (
    symbol: string,
    marketType: "spot" | "futures" = "spot"
  ) => {
    wishlistService.toggleWishlist(symbol, marketType);
  };

  // Clear wishlist
  const clearWishlist = () => {
    wishlistService.clearWishlist();
  };

  // Check if item is in wishlist
  const isInWishlist = (
    symbol: string,
    marketType: "spot" | "futures" = "spot"
  ) => {
    return wishlistService.isInWishlist(symbol, marketType);
  };

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
  };
}
