"use client";

import React, { memo, useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import { Star } from "lucide-react";
import { wishlistService } from "@/services/wishlist-service";
import type { MarketType } from "../../types/common";

interface FavoriteButtonProps {
  symbol: string;
  marketType?: MarketType;
}

export const FavoriteButton = memo(function FavoriteButton({
  symbol,
  marketType = "spot",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Check initial state
    const wsType = marketType === "futures" ? "futures" : "spot";
    setIsFavorite(wishlistService.isInWishlist(symbol, wsType));

    // Subscribe to wishlist changes for real-time sync
    const unsubscribe = wishlistService.subscribe((items) => {
      const inWishlist = items.some((item) => item.symbol === symbol);
      setIsFavorite(inWishlist);
    });

    return () => unsubscribe();
  }, [symbol, marketType]);

  const toggleFavorite = () => {
    const wsType = marketType === "futures" ? "futures" : "spot";
    wishlistService.toggleWishlist(symbol, wsType);
  };

  return (
    <button
      onClick={toggleFavorite}
      className={cn(
        "p-2 rounded-lg",
        "transition-colors",
        isFavorite
          ? "text-[var(--tp-yellow)] hover:text-[var(--tp-yellow)]/80"
          : "text-[var(--tp-text-muted)] hover:text-[var(--tp-yellow)]",
        "hover:bg-[var(--tp-bg-tertiary)]"
      )}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
    </button>
  );
});
