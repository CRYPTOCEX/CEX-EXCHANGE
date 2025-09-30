"use client";

import { useState, useEffect, useRef } from "react";
import {
  History,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from "next/navigation";
import { useWebSocketStore } from "@/store/websocket-store";
import { useUserStore } from "@/store/user";
interface ExchangeOrder {
  id: string;
  referenceId?: string;
  userId: string;
  status: "OPEN" | "CLOSED" | "CANCELED" | "EXPIRED" | "REJECTED";
  symbol: string;
  type: "MARKET" | "LIMIT";
  timeInForce: "GTC" | "IOC" | "FOK" | "PO";
  side: "BUY" | "SELL";
  price: number;
  average?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  trades?: string;
  fee: number;
  feeCurrency: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
  currency?: string;
  pair?: string;
  isEco?: boolean;
}
interface FuturesOrder {
  id: string;
  symbol: string;
  type: string;
  side: string;
  amount: number;
  price: number;
  cost: number;
  fee: number;
  filled: number;
  remaining: number;
  status: string;
  stop_loss_price?: number;
  take_profit_price?: number;
  leverage?: number;
  liquidation_price?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
interface FuturesPosition {
  id: string;
  userId: string;
  symbol: string;
  side: string;
  entryPrice: string;
  amount: string;
  leverage: string;
  unrealizedPnl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  liquidationPrice?: string;
}
interface OrdersPanelProps {
  symbol?: string;
  isEco?: boolean;
  pair?: string;
}

// Format date helper
const formatDate = (date: Date | string | undefined) => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateObj.toLocaleDateString();
};
export default function OrdersPanel({
  symbol = "BTCUSDT",
  isEco = false,
  pair,
}: OrdersPanelProps) {
  const searchParams = useSearchParams();
  const marketType = searchParams.get("type") || "spot";
  const isFutures = marketType === "futures";
  const { user } = useUserStore();

  // WebSocket store
  const {
    createConnection,
    removeConnection,
    subscribe,
    unsubscribe,
    addMessageHandler,
    removeMessageHandler,
    isConnectionOpen,
  } = useWebSocketStore();
  const [openOrders, setOpenOrders] = useState<
    ExchangeOrder[] | FuturesOrder[]
  >([]);
  const [orderHistory, setOrderHistory] = useState<
    ExchangeOrder[] | FuturesOrder[]
  >([]);
  const [positions, setPositions] = useState<FuturesPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(isFutures ? "positions" : "open");
  const [aiInvestments, setAiInvestments] = useState([]);
  const [isLoadingAiInvestments, setIsLoadingAiInvestments] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const wsHandlerRef = useRef<((message: any) => void) | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // WebSocket connection key
  const connectionKey = "ordersConnection";

  // Handle order WebSocket messages
  const handleOrderMessage = (message: any) => {
    if (!message || !message.data || !isMountedRef.current) return;
    const { data } = message;
    if (!data || !Array.isArray(data)) return;
    setOpenOrders((prevOpenOrders) => {
      const newItems = [...prevOpenOrders];
      for (const orderItem of data) {
        const index = newItems.findIndex((i: any) => i.id === orderItem.id);
        if (index > -1) {
          if (
            orderItem.status === "CLOSED" ||
            orderItem.status === "CANCELED" ||
            orderItem.status === "EXPIRED" ||
            orderItem.status === "REJECTED"
          ) {
            // If the order is no longer open, remove it from open orders
            newItems.splice(index, 1);

            // Also refresh order history to include the updated order
            fetchOrderHistory();
          } else {
            // Update existing open order
            newItems[index] = {
              ...newItems[index],
              ...orderItem,
            };
          }
        } else {
          // Add only if still open/active
          if (orderItem.status === "OPEN" || orderItem.status === "ACTIVE") {
            newItems.push(orderItem);
          }
        }
      }
      return newItems;
    });
  };

  // Debounced fetch functions
  const debouncedFetchOrders = (() => {
    let timeoutId: NodeJS.Timeout;
    return (callback: () => void) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, 100);
    };
  })();

  // Fetch open orders
  const fetchOpenOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the appropriate URL based on market type
      const url = isFutures
        ? `/api/futures/order?type=OPEN`
        : isEco
          ? `/api/ecosystem/order?type=OPEN`
          : `/api/exchange/order?status=OPEN`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setOpenOrders(data.data || []);
      } else {
        // Only set error if the API call actually failed, not if it just returned empty data
        if (data.message && !data.message.includes("No orders found")) {
          setError("Failed to fetch open orders");
          console.error("Failed to fetch open orders:", data);
        } else {
          // Set empty array if no orders found
          setOpenOrders([]);
        }
      }
    } catch (err) {
      setError("Error fetching open orders");
      console.error("Error fetching open orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch order history (non-open orders)
  const fetchOrderHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the appropriate URL based on market type
      const url = isFutures
        ? `/api/futures/order`
        : isEco
          ? `/api/ecosystem/order?type=HISTORY`
          : `/api/exchange/order`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        if (isEco) {
          // For eco, the API already returns history orders
          setOrderHistory(data.data || []);
        } else if (isFutures) {
          // For futures, filter out OPEN orders as they're handled separately
          const history = (data.data || []).filter(
            (order: FuturesOrder) => order.status !== "OPEN"
          );
          setOrderHistory(history);
        } else {
          // For regular exchange, filter out OPEN orders as they're handled separately
          const history = (data.data || []).filter(
            (order: ExchangeOrder) => order.status !== "OPEN"
          );
          setOrderHistory(history);
        }
      } else {
        // Only set error if the API call actually failed, not if it just returned empty data
        if (data.message && !data.message.includes("No orders found")) {
          setError("Failed to fetch order history");
          console.error("Failed to fetch order history:", data);
        } else {
          // Set empty array if no orders found
          setOrderHistory([]);
        }
      }
    } catch (err) {
      setError("Error fetching order history");
      console.error("Error fetching order history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch futures positions
  const fetchPositions = async () => {
    if (!isFutures) return;
    try {
      setIsLoadingPositions(true);
      setError(null);
      const response = await fetch(`/api/futures/position?type=OPEN_POSITIONS`);
      const data = await response.json();
      if (data.success) {
        setPositions(data.data || []);
      } else {
        // Only set error if the API call actually failed, not if it just returned empty data
        if (data.message && !data.message.includes("No positions found")) {
          setError("Failed to fetch positions");
          console.error("Failed to fetch positions:", data);
        } else {
          // Set empty array if no positions found
          setPositions([]);
        }
      }
    } catch (err) {
      setError("Error fetching positions");
      console.error("Error fetching positions:", err);
    } finally {
      setIsLoadingPositions(false);
    }
  };
  const fetchAiInvestments = async () => {
    try {
      setIsLoadingAiInvestments(true);
      const response = await fetch("/api/ai/investment/log");
      const data = await response.json();
      if (data.success) {
        setAiInvestments(data.data);
      } else {
        console.error("Failed to fetch AI investments:", data);
      }
    } catch (err) {
      console.error("Error fetching AI investments:", err);
    } finally {
      setIsLoadingAiInvestments(false);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.id) return;
    isMountedRef.current = true;

    // Determine the correct WebSocket path based on market type
    const wsPath = isFutures
      ? `/api/futures/order?userId=${user.id}`
      : isEco
        ? `/api/ecosystem/order?userId=${user.id}`
        : `/api/exchange/order?userId=${user.id}`;

    // Create WebSocket connection
    createConnection(connectionKey, wsPath, {
      onOpen: () => {
        console.log("Orders WebSocket connection opened");
      },
      onClose: () => {
        console.log("Orders WebSocket connection closed");
      },
      onError: (error) => {
        console.error("Orders WebSocket error:", error);
      },
    });
    return () => {
      isMountedRef.current = false;
      // Clean up WebSocket connection
      removeConnection(connectionKey);
    };
  }, [user?.id, isFutures, isEco]);

  // Subscribe to order updates when connection is ready
  useEffect(() => {
    if (!user?.id || !isConnectionOpen(connectionKey)) return;

    // Subscribe to orders stream
    subscribe(connectionKey, "orders", {
      userId: user.id,
    });

    // Add message handler
    const messageFilter = (message: any) => message.stream === "orders";
    addMessageHandler(connectionKey, handleOrderMessage, messageFilter);

    // Store handler reference for cleanup
    wsHandlerRef.current = handleOrderMessage;
    return () => {
      // Unsubscribe and remove message handler
      unsubscribe(connectionKey, "orders", {
        userId: user.id,
      });
      if (wsHandlerRef.current) {
        removeMessageHandler(connectionKey, wsHandlerRef.current);
        wsHandlerRef.current = null;
      }
    };
  }, [user?.id, isConnectionOpen(connectionKey)]);

  // Load data on component mount and when market type changes
  useEffect(() => {
    debouncedFetchOrders(() => {
      fetchOpenOrders();
      fetchOrderHistory();
      if (isFutures) {
        fetchPositions();
      }
    });
  }, [isFutures, isEco]);
  useEffect(() => {
    if (activeTab === "ai") {
      fetchAiInvestments();
    } else if (activeTab === "positions" && isFutures) {
      fetchPositions();
    }
  }, [activeTab, isFutures]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Filter and sort history
  const filteredHistory = orderHistory
    .filter((order: any) => {
      // Apply search filter
      if (
        searchTerm &&
        !order.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Apply status filter
      if (
        statusFilter !== "all" &&
        order.status.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }

      // Apply time filter
      if (timeFilter !== "all" && order.createdAt) {
        const now = new Date();
        const orderDate = new Date(order.createdAt);
        const diffHours =
          (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        if (timeFilter === "24h" && diffHours > 24) return false;
        if (timeFilter === "7d" && diffHours > 24 * 7) return false;
        if (timeFilter === "30d" && diffHours > 24 * 30) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      // Apply sorting
      if (sortBy === "date") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
      }
      if (sortBy === "price") {
        return sortDirection === "desc" ? b.price - a.price : a.price - b.price;
      }
      if (sortBy === "amount") {
        return sortDirection === "desc"
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
      return 0;
    });

  // Calculate pagination
  useEffect(() => {
    setTotalPages(Math.ceil(filteredHistory.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    filteredHistory.length,
    itemsPerPage,
    searchTerm,
    timeFilter,
    statusFilter,
  ]);

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredHistory.slice(startIndex, endIndex);
  };

  // Handle cancel order
  const handleCancelOrder = async (orderId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const timestamp = Date.now();

      // Use the appropriate URL based on market type
      const url = isFutures
        ? `/api/futures/order/${orderId}`
        : isEco
          ? `/api/ecosystem/order/${orderId}?timestamp=${timestamp}`
          : `/api/exchange/order`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        ...(isEco || isFutures
          ? {}
          : {
              body: JSON.stringify({
                action: "cancel",
                orderId,
              }),
            }),
      });
      const data = await response.json();
      if (data.success) {
        // Refresh open orders
        fetchOpenOrders();
      } else {
        setError("Failed to cancel order");
        console.error("Failed to cancel order:", data);
      }
    } catch (err) {
      setError("Error canceling order");
      console.error("Error canceling order:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close position
  const handleClosePosition = async (position: FuturesPosition) => {
    try {
      setIsLoading(true);
      setError(null);

      // Extract currency and pair from symbol (handle both "BTC/USDT" and "BTC-USDT" formats)
      let currency = "";
      let pair = "";
      
      if (position.symbol.includes("/")) {
        [currency, pair] = position.symbol.split("/");
      } else if (position.symbol.includes("-")) {
        [currency, pair] = position.symbol.split("-");
      } else {
        // Handle symbols like "BTCUSDT" by trying common pairs
        if (position.symbol.endsWith("USDT")) {
          currency = position.symbol.replace("USDT", "");
          pair = "USDT";
        } else if (position.symbol.endsWith("BUSD")) {
          currency = position.symbol.replace("BUSD", "");
          pair = "BUSD";
        } else if (position.symbol.endsWith("USD")) {
          currency = position.symbol.replace("USD", "");
          pair = "USD";
        } else {
          // Fallback: assume last 4 characters are the pair
          currency = position.symbol.substring(0, position.symbol.length - 4);
          pair = position.symbol.substring(position.symbol.length - 4);
        }
      }

      const response = await fetch(`/api/futures/position`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currency,
          pair,
          side: position.side,
        }),
      });
      const data = await response.json();
      if (data.success) {
        // Refresh positions
        fetchPositions();
      } else {
        setError("Failed to close position");
        console.error("Failed to close position:", data);
      }
    } catch (err) {
      setError("Error closing position");
      console.error("Error closing position:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel all orders
  const handleCancelAllOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const timestamp = Date.now();

      // Use the appropriate URL based on market type
      const url = isFutures
        ? `/api/futures/order/all`
        : isEco
          ? `/api/ecosystem/order/all?timestamp=${timestamp}`
          : `/api/exchange/order`;
      const response = await fetch(url, {
        method: isFutures || isEco ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        ...(isEco || isFutures
          ? {}
          : {
              body: JSON.stringify({
                action: "cancelAll",
              }),
            }),
      });
      const data = await response.json();
      if (data.success) {
        // Refresh open orders
        fetchOpenOrders();
      } else {
        setError("Failed to cancel all orders");
        console.error("Failed to cancel all orders:", data);
      }
    } catch (err) {
      setError("Error canceling all orders");
      console.error("Error canceling all orders:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancelAiInvestment = async (investmentId: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/ai/investment/log/${investmentId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        // Refresh AI investments
        fetchAiInvestments();
      } else {
        setError("Failed to cancel AI investment");
        console.error("Failed to cancel AI investment:", data);
      }
    } catch (err) {
      setError("Error canceling AI investment");
      console.error("Error canceling AI investment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total value of open orders
  const totalOpenOrdersValue = openOrders
    .reduce((acc, order: any) => acc + (order.cost || 0), 0)
    .toFixed(2);
  return (
    <div className="flex flex-col h-full bg-background dark:bg-black text-foreground dark:text-white">
      {/* Sticky tabs header */}
      <div className="flex-shrink-0 flex border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-background dark:bg-black z-10">
        {isFutures && (
          <button
            onClick={() => setActiveTab("positions")}
            className={cn(
              "flex items-center justify-center flex-1 py-2 text-xs font-medium",
              activeTab === "positions"
                ? "text-foreground dark:text-white border-b-2 border-primary dark:border-blue-500"
                : "text-muted-foreground dark:text-zinc-400"
            )}
          >
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Positions
          </button>
        )}
        <button
          onClick={() => setActiveTab("open")}
          className={cn(
            "flex items-center justify-center flex-1 py-2 text-xs font-medium",
            activeTab === "open"
              ? "text-foreground dark:text-white border-b-2 border-primary dark:border-blue-500"
              : "text-muted-foreground dark:text-zinc-400"
          )}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Open Orders
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "flex items-center justify-center flex-1 py-2 text-xs font-medium",
            activeTab === "history"
              ? "text-foreground dark:text-white border-b-2 border-primary dark:border-blue-500"
              : "text-muted-foreground dark:text-zinc-400"
          )}
        >
          <History className="h-3.5 w-3.5 mr-1.5" />
          History
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs p-2 rounded mx-2 mt-2 flex-shrink-0">
            {error}
          </div>
        )}

        {activeTab === "open" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                {openOrders.length > 0 && (
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px] px-1.5 border-zinc-200 dark:border-zinc-700 text-foreground dark:text-zinc-300"
                  >
                    {totalOpenOrdersValue}
                  </Badge>
                )}
              </div>

              {openOrders.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
                  onClick={handleCancelAllOrders}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Cancel All
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {openOrders.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background dark:bg-black">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Symbol
                      </th>
                      <th className="text-left p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Type
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Price{pair ? ` (${pair})` : ''}
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Amount
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Total
                      </th>
                      {isFutures && (
                        <>
                          <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                            SL
                          </th>
                          <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                            TP
                          </th>
                        </>
                      )}
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Time
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.map((order: any) => {
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-zinc-200/70 dark:border-zinc-900 hover:bg-muted dark:hover:bg-zinc-900 transition-colors"
                        >
                          <td className="p-2">
                            <div className="flex items-center">
                              <span
                                className={cn(
                                  "font-medium",
                                  order.side === "BUY" || order.side === "LONG"
                                    ? "text-emerald-600 dark:text-emerald-500"
                                    : "text-red-600 dark:text-red-500"
                                )}
                              >
                                {order.side === "BUY" || order.side === "LONG"
                                  ? "Buy"
                                  : "Sell"}
                              </span>
                              <span className="ml-1.5 text-foreground dark:text-zinc-300">
                                {order.symbol}
                              </span>
                              {order.isEco && (
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 h-4 text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                >
                                  ECO
                                </Badge>
                              )}
                              {isFutures && order.leverage && (
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 h-4 text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20"
                                >
                                  {order.leverage}x
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge
                              variant="outline"
                              className="font-normal bg-muted/50 dark:bg-zinc-800/50 text-foreground dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                            >
                              {order.type}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                            {Number(order.price).toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                            {Number(order.amount).toFixed(8)}
                          </td>
                          <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                            {Number(
                              order.cost || order.amount * order.price
                            ).toFixed(2)}
                          </td>
                          {isFutures && (
                            <>
                              <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                                {order.stop_loss_price
                                  ? Number(order.stop_loss_price).toFixed(2)
                                  : "-"}
                              </td>
                              <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                                {order.take_profit_price
                                  ? Number(order.take_profit_price).toFixed(2)
                                  : "-"}
                              </td>
                            </>
                          )}
                          <td className="p-2 text-right text-muted-foreground dark:text-zinc-400">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground dark:text-zinc-500">
                  <Clock className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">No open orders</p>
                  <p className="text-xs text-muted-foreground/70 dark:text-zinc-600 text-center max-w-[220px]">
                    Your active orders will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Order History</span>
                <Badge
                  variant="outline"
                  className="h-5 text-[10px] px-1.5 border-zinc-200 dark:border-zinc-700 text-foreground dark:text-zinc-300"
                >
                  {filteredHistory.length} orders
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-6 text-xs w-24 bg-background dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                />

                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="h-6 text-xs w-20 border-zinc-200 dark:border-zinc-800 bg-background dark:bg-zinc-900">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7d</SelectItem>
                    <SelectItem value="30d">Last 30d</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {filteredHistory.length > 0 ? (
                <>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background dark:bg-black">
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Symbol
                        </th>
                        <th className="text-left p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Type
                        </th>
                        <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Price{pair ? ` (${pair})` : ''}
                        </th>
                        <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Amount
                        </th>
                        <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Total
                        </th>
                        {isFutures && (
                          <>
                            <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                              SL
                            </th>
                            <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                              TP
                            </th>
                          </>
                        )}
                        <th className="text-center p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Status
                        </th>
                        <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCurrentPageItems().map((order: any) => {
                        return (
                          <tr
                            key={order.id}
                            className="border-b border-zinc-200/70 dark:border-zinc-900 transition-colors"
                          >
                            <td className="p-2">
                              <div className="flex items-center">
                                <span
                                  className={cn(
                                    "font-medium",
                                    order.side === "BUY" ||
                                      order.side === "LONG"
                                      ? "text-emerald-600 dark:text-emerald-500"
                                      : "text-red-600 dark:text-red-500"
                                  )}
                                >
                                  {order.side === "BUY" || order.side === "LONG"
                                    ? "Buy"
                                    : "Sell"}
                                </span>
                                <span className="ml-1.5 text-foreground dark:text-zinc-300">
                                  {order.symbol}
                                </span>
                                {order.isEco && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1.5 h-4 text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  >
                                    ECO
                                  </Badge>
                                )}
                                {isFutures && order.leverage && (
                                  <Badge
                                    variant="outline"
                                    className="ml-1.5 h-4 text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20"
                                  >
                                    {order.leverage}x
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge
                                variant="outline"
                                className="font-normal bg-muted/50 dark:bg-zinc-800/50 text-foreground dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                              >
                                {order.type}
                              </Badge>
                            </td>
                            <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                              {Number(order.price).toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                              {Number(order.amount).toFixed(8)}
                            </td>
                            <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                              {Number(
                                order.cost || order.amount * order.price
                              ).toFixed(2)}
                            </td>
                            {isFutures && (
                              <>
                                <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                                  {order.stop_loss_price
                                    ? Number(order.stop_loss_price).toFixed(2)
                                    : "-"}
                                </td>
                                <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                                  {order.take_profit_price
                                    ? Number(order.take_profit_price).toFixed(2)
                                    : "-"}
                                </td>
                              </>
                            )}
                            <td className="p-2 text-center">
                              <Badge
                                className={cn(
                                  "font-normal",
                                  order.status === "CLOSED" &&
                                    "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30",
                                  order.status === "CANCELED" &&
                                    "bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20 border-zinc-500/30",
                                  order.status === "REJECTED" &&
                                    "bg-red-500/20 text-red-400 hover:bg-red-500/20 border-red-500/30",
                                  order.status === "EXPIRED" &&
                                    "bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
                                )}
                              >
                                {order.status === "CLOSED" && (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                {(order.status === "CANCELED" ||
                                  order.status === "REJECTED" ||
                                  order.status === "EXPIRED") && (
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                )}
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-right text-muted-foreground dark:text-zinc-400">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-4 py-2">
                      <div className="text-xs text-muted-foreground dark:text-zinc-500">
                        Showing {(currentPage - 1) * itemsPerPage + 1}-
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredHistory.length
                        )}{" "}
                        of {filteredHistory.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs mx-2">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) =>
                            setItemsPerPage(Number.parseInt(value))
                          }
                        >
                          <SelectTrigger className="h-6 text-xs w-16 border-zinc-200 dark:border-zinc-800 bg-background dark:bg-zinc-900">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground dark:text-zinc-500">
                  <History className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">No order history</p>
                  <p className="text-xs text-muted-foreground/70 dark:text-zinc-600 text-center max-w-[220px]">
                    Your completed orders will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "positions" && isFutures && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  Open Positions ({positions.length})
                </span>
                {positions.length > 0 && (
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px] px-1.5 border-zinc-200 dark:border-zinc-700 text-foreground dark:text-zinc-300"
                  >
                    {positions
                      .reduce((acc, pos) => acc + Number(pos.amount), 0)
                      .toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {isLoadingPositions ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : positions.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background dark:bg-black">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Symbol
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Size
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Entry Price{pair ? ` (${pair})` : ''}
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Liq. Price{pair ? ` (${pair})` : ''}
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        PnL
                      </th>
                      <th className="text-right p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Time
                      </th>
                      <th className="text-center p-2 font-medium text-muted-foreground dark:text-zinc-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((position) => {
                      return (
                        <tr
                          key={position.id}
                          className="border-b border-zinc-200/70 dark:border-zinc-900 hover:bg-muted dark:hover:bg-zinc-900 transition-colors"
                        >
                          <td className="p-2">
                            <div className="flex items-center">
                              <span
                                className={cn(
                                  "font-medium",
                                  position.side === "LONG"
                                    ? "text-emerald-600 dark:text-emerald-500"
                                    : "text-red-600 dark:text-red-500"
                                )}
                              >
                                {position.side}
                              </span>
                              <span className="ml-1.5 text-foreground dark:text-zinc-300">
                                {position.symbol}
                              </span>
                              <Badge
                                variant="outline"
                                className="ml-1.5 h-4 text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20"
                              >
                                {position.leverage}x
                              </Badge>
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                            {Number(position.amount).toFixed(8)}
                          </td>
                          <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                            {Number(position.entryPrice).toFixed(2)}
                          </td>
                          <td className="p-2 text-right font-mono text-foreground dark:text-zinc-300">
                            {position.liquidationPrice
                              ? Number(position.liquidationPrice).toFixed(2)
                              : "-"}
                          </td>
                          <td className="p-2 text-right font-mono">
                            <span
                              className={
                                Number(position.unrealizedPnl) > 0
                                  ? "text-emerald-500"
                                  : Number(position.unrealizedPnl) < 0
                                    ? "text-red-500"
                                    : "text-foreground dark:text-zinc-300"
                              }
                            >
                              {Number(position.unrealizedPnl) > 0 ? "+" : ""}
                              {Number(position.unrealizedPnl).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2 text-right text-muted-foreground dark:text-zinc-400">
                            {formatDate(position.createdAt)}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
                              onClick={() => handleClosePosition(position)}
                              disabled={isLoading}
                            >
                              Close
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground dark:text-zinc-500">
                  <Briefcase className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">No open positions</p>
                  <p className="text-xs text-muted-foreground/70 dark:text-zinc-600 text-center max-w-[220px]">
                    Your active positions will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
