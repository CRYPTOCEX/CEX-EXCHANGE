"use client";

import React, { memo, useState } from "react";
import { cn } from "../../utils/cn";

type OrderStatus = "open" | "filled" | "cancelled" | "partial";
type OrderTab = "open" | "history";

interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market" | "stop_limit" | "stop_market";
  price?: number;
  amount: number;
  filled: number;
  status: OrderStatus;
  createdAt: string;
}

interface MobileOrdersListProps {
  orders?: Order[];
  onCancelOrder?: (orderId: string) => void;
  className?: string;
}

// Mock orders for demo
const MOCK_OPEN_ORDERS: Order[] = [
  {
    id: "ord1",
    symbol: "BTC/USDT",
    side: "buy",
    type: "limit",
    price: 41500,
    amount: 0.05,
    filled: 0,
    status: "open",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ord2",
    symbol: "ETH/USDT",
    side: "sell",
    type: "stop_limit",
    price: 2400,
    amount: 0.5,
    filled: 0,
    status: "open",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

const MOCK_ORDER_HISTORY: Order[] = [
  {
    id: "ord3",
    symbol: "BTC/USDT",
    side: "buy",
    type: "market",
    amount: 0.02,
    filled: 0.02,
    status: "filled",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "ord4",
    symbol: "SOL/USDT",
    side: "sell",
    type: "limit",
    price: 98,
    amount: 10,
    filled: 5,
    status: "cancelled",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const MobileOrdersList = memo(function MobileOrdersList({
  orders,
  onCancelOrder,
  className,
}: MobileOrdersListProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>("open");

  const openOrders = orders?.filter((o) => o.status === "open") ?? MOCK_OPEN_ORDERS;
  const orderHistory = orders?.filter((o) => o.status !== "open") ?? MOCK_ORDER_HISTORY;

  const displayOrders = activeTab === "open" ? openOrders : orderHistory;

  return (
    <div className={cn("flex flex-col h-full bg-[var(--tp-bg-secondary)]", className)}>
      {/* Tabs */}
      <div className="flex border-b border-[var(--tp-border)]">
        {(["open", "history"] as OrderTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-[var(--tp-text-primary)] border-b-2 border-[var(--tp-blue)]"
                : "text-[var(--tp-text-muted)]"
            )}
          >
            {tab === "open" ? `Open Orders (${openOrders.length})` : "Order History"}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto">
        {displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[var(--tp-text-muted)]/50 mb-3"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <p className="text-sm text-[var(--tp-text-muted)]">
              {activeTab === "open" ? "No open orders" : "No order history"}
            </p>
          </div>
        ) : (
          displayOrders.map((order) => (
            <MobileOrderRow
              key={order.id}
              order={order}
              onCancel={() => onCancelOrder?.(order.id)}
              showCancel={activeTab === "open"}
            />
          ))
        )}
      </div>

      {/* Cancel All (for open orders) */}
      {activeTab === "open" && openOrders.length > 1 && (
        <div className="p-3 border-t border-[var(--tp-border)]">
          <button
            className={cn(
              "w-full py-2.5 rounded-lg",
              "text-sm font-medium",
              "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]",
              "active:bg-[var(--tp-bg-elevated)]"
            )}
          >
            Cancel All Orders
          </button>
        </div>
      )}
    </div>
  );
});

interface MobileOrderRowProps {
  order: Order;
  onCancel: () => void;
  showCancel: boolean;
}

const MobileOrderRow = memo(function MobileOrderRow({
  order,
  onCancel,
  showCancel,
}: MobileOrderRowProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fillPercent = (order.filled / order.amount) * 100;

  return (
    <div className="px-3 py-3 border-b border-[var(--tp-border)]">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--tp-text-primary)]">
            {order.symbol}
          </span>
          <span
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded",
              order.side === "buy"
                ? "bg-[var(--tp-green)]/20 text-[var(--tp-green)]"
                : "bg-[var(--tp-red)]/20 text-[var(--tp-red)]"
            )}
          >
            {order.side.toUpperCase()}
          </span>
          <span className="text-[10px] text-[var(--tp-text-muted)] capitalize">
            {order.type.replace("_", " ")}
          </span>
        </div>

        {/* Status Badge */}
        <span
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-medium rounded capitalize",
            order.status === "filled" && "bg-[var(--tp-green)]/20 text-[var(--tp-green)]",
            order.status === "cancelled" && "bg-[var(--tp-text-muted)]/20 text-[var(--tp-text-muted)]",
            order.status === "open" && "bg-[var(--tp-blue)]/20 text-[var(--tp-blue)]",
            order.status === "partial" && "bg-[var(--tp-yellow)]/20 text-[var(--tp-yellow)]"
          )}
        >
          {order.status}
        </span>
      </div>

      {/* Details Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          {order.price && (
            <div className="text-[var(--tp-text-secondary)]">
              Price: <span className="font-mono">${order.price.toFixed(2)}</span>
            </div>
          )}
          <div className="text-[var(--tp-text-secondary)]">
            Amount: <span className="font-mono">{order.amount}</span>
            {order.filled > 0 && (
              <span className="text-[var(--tp-text-muted)]">
                {" "}(Filled: {order.filled})
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[var(--tp-text-muted)]">
            {formatDate(order.createdAt)}
          </div>
        </div>
      </div>

      {/* Fill Progress (for partial fills) */}
      {order.filled > 0 && order.filled < order.amount && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-[var(--tp-text-muted)] mb-0.5">
            <span>Fill Progress</span>
            <span>{fillPercent.toFixed(1)}%</span>
          </div>
          <div className="h-1 bg-[var(--tp-bg-tertiary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--tp-green)] rounded-full"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {showCancel && order.status === "open" && (
        <button
          onClick={onCancel}
          className={cn(
            "mt-2 w-full py-2 rounded-lg",
            "text-xs font-medium",
            "bg-[var(--tp-bg-tertiary)] text-[var(--tp-text-secondary)]",
            "active:bg-[var(--tp-bg-elevated)]"
          )}
        >
          Cancel Order
        </button>
      )}
    </div>
  );
});

export default MobileOrdersList;
