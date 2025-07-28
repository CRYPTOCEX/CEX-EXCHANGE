"use client";

import React from "react";
import { useTableStore } from "../store";
import { Loader2 } from "lucide-react";

export function HeaderClient() {
  const totalItems = useTableStore((state) => state.totalItems);
  const totalItemsLoading = useTableStore((state) => state.totalItemsLoading);

  return (
    <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-0.5 text-sm">
      {totalItemsLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        totalItems
      )}
    </span>
  );
}
