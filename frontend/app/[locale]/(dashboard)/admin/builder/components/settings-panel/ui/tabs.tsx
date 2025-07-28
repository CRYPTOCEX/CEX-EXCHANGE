"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type React from "react";

interface TabsProps {
  defaultTab: string;
  tabs: { id: string; label: string }[];
  children: (activeTab: string) => React.ReactNode;
  className?: string;
}

export function Tabs({ defaultTab, tabs, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex border-b dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 text-center py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
                : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1">{children(activeTab)}</div>
    </div>
  );
}
