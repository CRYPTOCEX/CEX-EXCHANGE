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
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 text-center py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-subtle-foreground hover:text-muted-foreground hover:border-border-strong"
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
