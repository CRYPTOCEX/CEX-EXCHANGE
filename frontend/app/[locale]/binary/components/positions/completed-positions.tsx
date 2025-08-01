"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronUp,
  Clock,
  DollarSign,
  BarChart2,
  Filter,
  Download,
} from "lucide-react";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import type { CompletedOrder } from "@/store/trade/use-binary-store";
interface CompletedPositionsProps {
  className?: string;
  theme?: "dark" | "light";
  isMobile?: boolean;
}
export default function CompletedPositions({
  className = "",
  theme = "dark",
  isMobile = false,
}: CompletedPositionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "WIN" | "LOSS">("all");
  const [sortBy, setSortBy] = useState<"time" | "profit" | "symbol">("time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [hoveredOrder, setHoveredOrder] = useState<string | null>(null);
  const [sortedOrders, setSortedOrders] = useState<CompletedOrder[]>([]);
  const [stats, setStats] = useState({
    totalProfit: 0,
    winRate: "0.0",
    completedOrdersCount: 0,
  });
  const contentRef = useRef<HTMLDivElement>(null);
  const { completedOrders, isLoadingOrders, fetchCompletedOrders } =
    useBinaryStore();

  // Theme-based classes using zinc colors
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const bgGradientClass =
    theme === "dark"
      ? "bg-zinc-900/95 backdrop-blur-md"
      : "bg-white/95 backdrop-blur-md";
  const textClass = theme === "dark" ? "text-white" : "text-black";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const borderLightClass =
    theme === "dark" ? "border-zinc-800/50" : "border-zinc-100";
  const secondaryBgClass = theme === "dark" ? "bg-zinc-950" : "bg-zinc-50";
  const hoverBgClass =
    theme === "dark" ? "hover:bg-zinc-900/30" : "hover:bg-zinc-100";
  const activeBgClass = theme === "dark" ? "bg-zinc-900" : "bg-zinc-100";
  const secondaryTextClass =
    theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const tertiaryTextClass =
    theme === "dark" ? "text-zinc-500" : "text-zinc-400";
  const badgeBgClass = theme === "dark" ? "bg-zinc-900" : "bg-zinc-100";
  const tableHeaderClass = theme === "dark" ? "bg-zinc-900" : "bg-zinc-100";
  const winBadgeClass =
    theme === "dark"
      ? "bg-[#22c55e]/20 text-[#22c55e]"
      : "bg-green-100 text-green-600";
  const lossBadgeClass =
    theme === "dark"
      ? "bg-[#ef4444]/20 text-[#ef4444]"
      : "bg-red-100 text-red-600";
  const headerBgClass = theme === "dark" ? "bg-zinc-900" : "bg-zinc-100";
  const iconClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const tableValueClass = theme === "dark" ? "text-zinc-300" : "text-zinc-800";
  const updateSortedOrders = (orders: CompletedOrder[]) => {
    let filteredOrders = [...orders];
    if (filter !== "all") {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === filter
      );
    }
    const sorted = [...filteredOrders].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "time") {
        comparison = a.expiryTime.getTime() - b.expiryTime.getTime();
      } else if (sortBy === "profit") {
        comparison = (a.profit || 0) - (b.profit || 0);
      } else if (sortBy === "symbol") {
        comparison = a.symbol.localeCompare(b.symbol);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    setSortedOrders(sorted);
  };

  // Process orders and update stats when orders change
  useEffect(() => {
    // Ensure we have orders to process
    if (!completedOrders || completedOrders.length === 0) {
      setSortedOrders([]);
      setStats({
        totalProfit: 0,
        winRate: "0.0",
        completedOrdersCount: 0,
      });
      return;
    }
    const completedOrdersCount = completedOrders.length;

    // Calculate total profit/loss
    const totalProfit = completedOrders.reduce(
      (sum, order) => sum + (order.profit || 0),
      0
    );
    const winRate =
      completedOrders.length > 0
        ? (
            (completedOrders.filter((order) => order.status === "WIN").length /
              completedOrders.length) *
            100
          ).toFixed(1)
        : "0.0";
    setStats({
      totalProfit,
      winRate,
      completedOrdersCount,
    });

    // Update sorted orders
    updateSortedOrders(completedOrders);
  }, [completedOrders, filter, sortBy, sortDirection]);

  // Hide the component when there are no completed trades
  if (stats.completedOrdersCount === 0) {
    return null;
  }

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  // Toggle sort
  const toggleSort = (newSortBy: "time" | "profit" | "symbol") => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortDirection("desc");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Time",
      "Symbol",
      "Side",
      "Entry Price",
      "Exit Price",
      "Amount",
      "Profit/Loss",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...sortedOrders.map((order) =>
        [
          formatDate(order.entryTime),
          formatTime(order.entryTime),
          order.symbol,
          order.side,
          order.entryPrice.toFixed(2),
          order.closePrice ? order.closePrice.toFixed(2) : "N/A",
          order.amount.toFixed(2),
          (order.profit || 0).toFixed(2),
          order.status,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `trading-history-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // For mobile, always show content without collapsible behavior
  if (isMobile) {
    return (
      <div className={`w-full h-full flex flex-col ${bgClass} ${className}`}>
        {/* Mobile header with stats */}
        <div
          className={`flex-shrink-0 ${headerBgClass} border-b ${borderClass} px-4 py-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart2 size={16} className="mr-2 text-zinc-500" />
              <span className={`font-medium text-sm ${textClass}`}>
                Trading History
              </span>
            </div>
            {stats.completedOrdersCount > 0 && (
              <div className="flex items-center space-x-3">
                <div
                  className={`text-sm ${stats.totalProfit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                >
                  {stats.totalProfit >= 0 ? "+" : ""}$
                  {stats.totalProfit.toFixed(2)}
                </div>
                <div className={`text-xs ${secondaryTextClass}`}>
                  Win:{" "}
                  <span
                    className={
                      Number(stats.winRate) > 50
                        ? "text-[#22c55e]"
                        : secondaryTextClass
                    }
                  >
                    {stats.winRate}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile filters */}
        <div
          className={`flex-shrink-0 px-4 py-3 border-b ${borderLightClass}`}
        >
          <div className="flex gap-2">
            <button
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 ${filter === "all" ? activeBgClass + " " + textClass + " shadow-sm" : secondaryTextClass + " hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 ${filter === "WIN" ? "bg-green-500/20 text-[#22c55e] shadow-sm" : secondaryTextClass + " hover:bg-green-500/10 hover:text-[#22c55e]"}`}
              onClick={() => setFilter("WIN")}
            >
              Won
            </button>
            <button
              className={`flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition-all duration-200 ${filter === "LOSS" ? "bg-red-500/20 text-[#ef4444] shadow-sm" : secondaryTextClass + " hover:bg-red-500/10 hover:text-[#ef4444]"}`}
              onClick={() => setFilter("LOSS")}
            >
              Lost
            </button>
          </div>
        </div>

        {/* Mobile content - simplified list */}
        <div className="flex-1 overflow-y-auto">
          {sortedOrders.length > 0 ? (
            sortedOrders.map((order) => {
              return (
                <div
                  key={order.id}
                  className={`p-4 border-b ${borderLightClass} transition-colors duration-200`}
                >
                  {/* First row: Symbol, Side, and Status */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center flex-1 min-w-0">
                      <span className={`font-semibold text-base ${tableValueClass} truncate`}>
                        {order.symbol.replace("USDT", "").replace("/", "")}
                      </span>
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded font-medium ${order.side === "RISE" ? "bg-green-500/20 text-[#22c55e]" : "bg-red-500/20 text-[#ef4444]"}`}
                      >
                        {order.side}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${order.status === "WIN" ? winBadgeClass : lossBadgeClass}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Second row: Amount and Profit/Loss */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex flex-col">
                      <span className={`text-xs ${secondaryTextClass} uppercase tracking-wide`}>
                        Amount
                      </span>
                      <span className={`text-sm font-medium ${tableValueClass}`}>
                        ${order.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-xs ${secondaryTextClass} uppercase tracking-wide`}>
                        {(order.profit || 0) >= 0 ? "Profit" : "Loss"}
                      </span>
                      <span
                        className={`text-sm font-bold ${(order.profit || 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                      >
                        {(order.profit || 0) >= 0 ? "+" : ""}$
                        {Math.abs(order.profit || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Third row: Time and Entry Price */}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className={`text-xs ${secondaryTextClass} uppercase tracking-wide`}>
                        Time
                      </span>
                      <span className={`text-xs ${secondaryTextClass}`}>
                        {formatTime(order.expiryTime)} • {formatDate(order.expiryTime)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-xs ${secondaryTextClass} uppercase tracking-wide`}>
                        Entry Price
                      </span>
                      <span className={`text-xs ${tableValueClass} font-mono`}>
                        ${order.entryPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className={`flex flex-col items-center justify-center py-8 ${secondaryTextClass}`}
            >
              <BarChart2 size={24} className="mb-2 opacity-50" />
              <p>No completed trades found</p>
              <p className="text-xs mt-1">Completed trades will appear here</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={`w-full ${className}`}>
      {/* Fixed container with smooth transition */}
      <div
        className={`transition-transform duration-300 ease-in-out ${isOpen ? "translate-y-0" : "translate-y-[calc(100%-40px)]"}`}
        style={{
          boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header bar - always visible */}
        <div
          className={`${headerBgClass} border-t ${borderClass} px-4 py-2 flex items-center justify-between cursor-pointer transition-colors duration-200`}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <div className="flex items-center">
            <BarChart2 size={16} className="mr-2 text-zinc-500" />
            <span
              className={`font-medium ${theme === "dark" ? "text-white" : "text-black"}`}
            >
              Trading History
            </span>
            {stats.completedOrdersCount > 0 && (
              <>
                <div
                  className={`ml-3 text-sm ${stats.totalProfit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                >
                  {stats.totalProfit >= 0 ? "+" : ""}$
                  {stats.totalProfit.toFixed(2)}
                </div>
                <div
                  className={`ml-3 text-xs ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
                >
                  Win Rate:{" "}
                  <span
                    className={
                      Number(stats.winRate) > 50
                        ? "text-[#22c55e]"
                        : theme === "dark"
                          ? "text-zinc-300"
                          : "text-zinc-400"
                    }
                  >
                    {stats.winRate}%
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center">
            <ChevronUp
              size={20}
              className={`transform transition-transform duration-300 ${iconClass} ${isOpen ? "rotate-180" : "rotate-0"}`}
            />
          </div>
        </div>

        {/* Content panel */}
        <div
          ref={contentRef}
          className={`${bgClass} border-t ${borderClass} overflow-hidden transition-all duration-300`}
          style={{
            maxHeight: isOpen ? "300px" : "0px",
            opacity: isOpen ? 1 : 0,
          }}
        >
          {/* Filters and controls */}
          <div
            className={`flex justify-between items-center p-2 border-b ${borderLightClass}`}
          >
            <div className="flex items-center">
              <div className="flex">
                <button
                  className={`px-4 py-2 text-sm transition-colors ${filter === "all" ? (theme === "dark" ? "bg-zinc-900 text-white" : "bg-white text-black border-b-2 border-zinc-300") : theme === "dark" ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  className={`px-4 py-2 text-sm transition-colors ${filter === "WIN" ? (theme === "dark" ? "bg-zinc-900 text-[#22c55e]" : "bg-white text-black") : theme === "dark" ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`}
                  onClick={() => setFilter("WIN")}
                >
                  Won
                </button>
                <button
                  className={`px-4 py-2 text-sm transition-colors ${filter === "LOSS" ? (theme === "dark" ? "bg-zinc-900 text-[#ef4444]" : "bg-white text-black") : theme === "dark" ? "text-zinc-400 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-700"}`}
                  onClick={() => setFilter("LOSS")}
                >
                  Lost
                </button>
              </div>
              <div
                className={`flex items-center ml-4 ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}
              >
                <Filter size={16} className="mr-1" />
                <span className="text-sm">Filter</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={exportToCSV}
                className={`flex items-center text-sm ${theme === "dark" ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"} rounded-md px-3 py-1.5 transition-colors`}
              >
                <Download size={14} className="mr-1.5" />
                Export
              </button>
            </div>
          </div>

          {/* Table header */}
          <div
            className={`grid grid-cols-7 gap-2 px-4 py-2 border-b ${borderLightClass} text-xs font-medium ${tableHeaderClass} ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}`}
          >
            <div
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("time")}
            >
              <Clock size={12} className="mr-1" />
              Time
              {sortBy === "time" && (
                <span className="ml-1">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </div>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("symbol")}
            >
              Symbol
              {sortBy === "symbol" && (
                <span className="ml-1">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </div>
            <div>Side</div>
            <div>Entry Price</div>
            <div>Amount</div>
            <div
              className="flex items-center cursor-pointer"
              onClick={() => toggleSort("profit")}
            >
              <DollarSign size={12} className="mr-1" />
              Profit/Loss
              {sortBy === "profit" && (
                <span className="ml-1">
                  {sortDirection === "asc" ? "↑" : "↓"}
                </span>
              )}
            </div>
            <div>Status</div>
          </div>

          {/* Table content */}
          <div className="max-h-[200px] overflow-y-auto">
            {sortedOrders.length > 0 ? (
              sortedOrders.map((order, index) => {
                return (
                  <div
                    key={order.id}
                    className={`grid grid-cols-7 gap-2 px-4 py-3 text-sm border-b ${borderLightClass} transition-colors duration-200 ${hoveredOrder === order.id ? (theme === "dark" ? "bg-zinc-900/30" : "bg-zinc-50") : ""}`}
                    onMouseEnter={() => setHoveredOrder(order.id)}
                    onMouseLeave={() => setHoveredOrder(null)}
                  >
                    <div className={tableValueClass}>
                      <div>{formatTime(order.expiryTime)}</div>
                      <div className={`text-xs ${tertiaryTextClass}`}>
                        {formatDate(order.expiryTime)}
                      </div>
                    </div>
                    <div className={`font-medium ${tableValueClass}`}>
                      {order.symbol.replace("USDT", "").replace("/", "")}
                    </div>
                    <div
                      className={
                        order.side === "RISE"
                          ? "text-[#22c55e]"
                          : "text-[#ef4444]"
                      }
                    >
                      {order.side}
                    </div>
                    <div className={tableValueClass}>
                      ${order.entryPrice.toFixed(2)}
                    </div>
                    <div className={tableValueClass}>
                      ${order.amount.toFixed(2)}
                    </div>
                    <div
                      className={`font-medium ${(order.profit || 0) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                    >
                      {(order.profit || 0) >= 0 ? "+" : ""}$
                      {Math.abs(order.profit || 0).toFixed(2)}
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${order.status === "WIN" ? winBadgeClass : lossBadgeClass}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className={`flex flex-col items-center justify-center py-8 ${secondaryTextClass}`}
              >
                <BarChart2 size={24} className="mb-2 opacity-50" />
                <p>No completed trades found</p>
                <p className="text-xs mt-1">
                  Completed trades will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
