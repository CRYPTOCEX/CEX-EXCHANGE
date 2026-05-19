"use client";

import React, { memo } from "react";
import { cn } from "../../utils/cn";

export type MarketCategory = "all" | "defi" | "layer1" | "layer2" | "meme" | "gaming" | "ai" | "rwa";

interface MarketCategoriesProps {
  activeCategory: MarketCategory;
  onChange: (category: MarketCategory) => void;
}

const categories: { id: MarketCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "defi", label: "DeFi" },
  { id: "layer1", label: "Layer 1" },
  { id: "layer2", label: "Layer 2" },
  { id: "meme", label: "Meme" },
  { id: "gaming", label: "Gaming" },
  { id: "ai", label: "AI" },
  { id: "rwa", label: "RWA" },
];

export const MarketCategories = memo(function MarketCategories({
  activeCategory,
  onChange,
}: MarketCategoriesProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto scrollbar-none">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onChange(category.id)}
          className={cn(
            "px-2 py-1",
            "text-[10px] font-medium",
            "rounded",
            "whitespace-nowrap",
            "transition-colors",
            activeCategory === category.id
              ? "bg-[var(--tp-bg-elevated)] text-[var(--tp-text-primary)]"
              : "text-[var(--tp-text-muted)] hover:text-[var(--tp-text-secondary)]"
          )}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
});

export default MarketCategories;
