"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WalletTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function WalletTabs({ activeTab, onTabChange }: WalletTabsProps) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "all-wallets", label: "All Wallets" },
    { id: "quick-actions", label: "Quick Actions" },
  ];

  return (
    <div className="flex rounded-lg bg-gray-100 dark:bg-zinc-800/50 p-1 relative">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 relative py-2 text-sm font-medium transition-colors rounded-md z-10",
            activeTab === tab.id
              ? "text-blue-600 dark:text-white font-medium"
              : "text-gray-600 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-300"
          )}
        >
          {tab.label}
        </button>
      ))}

      {/* Animated background for active tab */}
      <motion.div
        className="absolute inset-y-1 rounded-md bg-white dark:bg-zinc-700 z-0"
        initial={false}
        animate={{
          width: `${100 / tabs.length}%`,
          x: `${tabs.findIndex((tab) => tab.id === activeTab) * 100}%`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      {/* Blue underline indicator */}
      <motion.div
        className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full"
        initial={false}
        animate={{
          width: `${100 / tabs.length - 10}%`,
          x: `${tabs.findIndex((tab) => tab.id === activeTab) * 100 + 5}%`,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
