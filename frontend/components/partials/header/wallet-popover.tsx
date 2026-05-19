"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useWalletStore } from "@/store/finance/wallet-store";
import { Icon } from "@iconify/react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

// Skeleton component for loading state
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-zinc-700/50",
        className
      )}
    />
  );
}

// Skeleton loading state that mimics the real content
function WalletPopoverSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <>
      {/* Header Skeleton */}
      <div
        className={cn(
          "relative px-4 py-3 overflow-hidden",
          isDark
            ? "bg-gradient-to-br from-zinc-800/80 to-zinc-900/80"
            : "bg-gradient-to-br from-zinc-50 to-white"
        )}
      >
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet
                className={cn(
                  "w-3.5 h-3.5",
                  isDark ? "text-zinc-600" : "text-zinc-300"
                )}
              />
              <Skeleton className={cn("h-2.5 w-16", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
            </div>
            <Skeleton className={cn("h-3 w-12", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
          </div>
          <Skeleton className={cn("h-6 w-32 mt-1.5", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div
        className={cn(
          "px-4 py-2 border-b flex items-center justify-between",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className={cn("h-2 w-6", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
            <Skeleton className={cn("h-4 w-5", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className={cn("h-2 w-8", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
            <Skeleton className={cn("h-4 w-5", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
          </div>
        </div>
        <Skeleton className={cn("h-2 w-16", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
      </div>

      {/* Wallet Types Skeleton */}
      <div className="px-3 py-2 space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Skeleton className={cn("w-7 h-7 rounded-lg", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
              <div className="space-y-1">
                <Skeleton className={cn("h-3 w-10", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
                <Skeleton className={cn("h-2 w-14", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
              </div>
            </div>
            <Skeleton className={cn("h-3 w-16", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div
        className={cn(
          "px-3 py-2 border-t",
          isDark ? "border-zinc-800" : "border-zinc-200"
        )}
      >
        <Skeleton className={cn("h-8 w-full rounded-lg", isDark ? "bg-zinc-700/50" : "bg-zinc-200")} />
      </div>
    </>
  );
}

interface WalletPopoverProps {
  isDark: boolean;
  children: React.ReactNode;
}

export function WalletPopover({ isDark, children }: WalletPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const {
    totalBalance,
    totalChange,
    totalChangePercent,
    totalWallets,
    activeWallets,
    walletsByType,
    isLoadingStats,
    fetchStats,
  } = useWalletStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const isPositiveChange = totalChange >= 0;

  const walletTypes = [
    {
      key: "SPOT",
      label: "Spot",
      icon: "solar:wallet-bold-duotone",
      color: "from-blue-500 to-cyan-500",
      balance: walletsByType?.SPOT?.balanceUSD || 0,
      count: walletsByType?.SPOT?.count || 0,
    },
    {
      key: "FIAT",
      label: "Fiat",
      icon: "solar:dollar-minimalistic-bold-duotone",
      color: "from-green-500 to-emerald-500",
      balance: walletsByType?.FIAT?.balanceUSD || 0,
      count: walletsByType?.FIAT?.count || 0,
    },
    {
      key: "ECO",
      label: "Eco",
      icon: "solar:planet-2-bold-duotone",
      color: "from-purple-500 to-pink-500",
      balance: walletsByType?.ECO?.balanceUSD || 0,
      count: walletsByType?.ECO?.count || 0,
    },
    {
      key: "FUTURES",
      label: "Futures",
      icon: "solar:chart-2-bold-duotone",
      color: "from-orange-500 to-red-500",
      balance: walletsByType?.FUTURES?.balanceUSD || 0,
      count: walletsByType?.FUTURES?.count || 0,
    },
  ];

  // Filter wallet types with balance > 0
  const activeWalletTypes = walletTypes.filter((type) => type.count > 0);

  return (
    <div className="relative" ref={popoverRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed sm:absolute top-auto sm:top-full right-2 sm:right-0 mt-2",
              "w-[calc(100vw-16px)] sm:w-[320px] max-w-[320px]",
              "rounded-xl overflow-hidden z-50",
              "border shadow-2xl backdrop-blur-xl",
              isDark
                ? "bg-zinc-900/98 border-zinc-800"
                : "bg-white/98 border-zinc-200"
            )}
            style={{
              maxHeight: "calc(100vh - 80px)",
            }}
          >
            {isLoadingStats ? (
              <WalletPopoverSkeleton isDark={isDark} />
            ) : (
              <>
                {/* Header with Total Balance - Compact */}
                <div
                  className={cn(
                    "relative px-4 py-3 overflow-hidden",
                    isDark
                      ? "bg-gradient-to-br from-zinc-800/80 to-zinc-900/80"
                      : "bg-gradient-to-br from-zinc-50 to-white"
                  )}
                >
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wallet
                          className={cn(
                            "w-3.5 h-3.5",
                            isDark ? "text-zinc-400" : "text-zinc-500"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] font-medium uppercase tracking-wider",
                            isDark ? "text-zinc-400" : "text-zinc-500"
                          )}
                        >
                          Total Balance
                        </span>
                      </div>
                      {totalChangePercent !== 0 && (
                        <div className="flex items-center gap-0.5">
                          {isPositiveChange ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          )}
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isPositiveChange ? "text-green-500" : "text-red-500"
                            )}
                          >
                            {isPositiveChange ? "+" : ""}
                            {totalChangePercent?.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <h3
                      className={cn(
                        "text-xl font-bold mt-0.5",
                        isDark ? "text-white" : "text-zinc-900"
                      )}
                    >
                      {formatCurrency(totalBalance || 0, "USD")}
                    </h3>
                  </div>
                </div>

                {/* Wallet Stats - Compact inline */}
                <div
                  className={cn(
                    "px-4 py-2 border-b flex items-center justify-between",
                    isDark ? "border-zinc-800" : "border-zinc-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[10px]",
                          isDark ? "text-zinc-500" : "text-zinc-400"
                        )}
                      >
                        Total
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {totalWallets || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[10px]",
                          isDark ? "text-zinc-500" : "text-zinc-400"
                        )}
                      >
                        Active
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {activeWallets || 0}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px]",
                      isDark ? "text-zinc-500" : "text-zinc-400"
                    )}
                  >
                    24h: {formatCurrency(totalChange || 0, "USD")}
                  </span>
                </div>

                {/* Wallet Types - Compact grid */}
                <div className="px-3 py-2 space-y-1 max-h-[200px] overflow-y-auto">
                  {activeWalletTypes.map((type, index) => (
                    <motion.div
                      key={type.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-200",
                        isDark ? "hover:bg-zinc-800/50" : "hover:bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br",
                            type.color
                          )}
                        >
                          <Icon icon={type.icon} className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-xs font-medium leading-tight",
                              isDark ? "text-white" : "text-zinc-900"
                            )}
                          >
                            {type.label}
                          </p>
                          <p
                            className={cn(
                              "text-[10px] leading-tight",
                              isDark ? "text-zinc-500" : "text-zinc-400"
                            )}
                          >
                            {type.count} {type.count === 1 ? "wallet" : "wallets"}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          isDark ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {formatCurrency(type.balance, "USD")}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Footer Action - Compact */}
                <div
                  className={cn(
                    "px-3 py-2 border-t",
                    isDark ? "border-zinc-800" : "border-zinc-200"
                  )}
                >
                  <Link
                    href="/finance/wallet"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all duration-200 group",
                      isDark
                        ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                        : "bg-zinc-900 hover:bg-zinc-800 text-white"
                    )}
                  >
                    <span className="text-xs font-medium">View All Wallets</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
