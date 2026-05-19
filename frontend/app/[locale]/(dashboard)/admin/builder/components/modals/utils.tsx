"use client";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Reusable search input component
export const SearchInput = ({ placeholder, value, onChange }) => (
  <div className="relative">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground dark:text-zinc-400" />
    <Input
      placeholder={placeholder}
      className="pl-8 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400"
      value={value}
      onChange={onChange}
    />
  </div>
);

// Generic filter helper to filter an array of items by one or more keys
export const filterItems = (
  items,
  searchTerm,
  keys = ["name", "description"]
) => {
  if (!searchTerm) return items;
  const lower = searchTerm.toLowerCase();
  return items.filter((item) =>
    keys.some((key) => item[key]?.toLowerCase().includes(lower))
  );
};

// Hook to manage last selection using localStorage
export const useLastSelection = (
  initial = { view: "elements", category: "all" }
) => {
  const [lastSelection, setLastSelection] = useState(() => {
    if (typeof window === "undefined") return initial;
    try {
      const stored = localStorage.getItem("builder_content_selection");
      return stored ? JSON.parse(stored) : initial;
    } catch (e) {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "builder_content_selection",
          JSON.stringify(lastSelection)
        );
      } catch (e) {
        console.error("Failed to save selection to localStorage", e);
      }
    }
  }, [lastSelection]);

  return [lastSelection, setLastSelection];
};
