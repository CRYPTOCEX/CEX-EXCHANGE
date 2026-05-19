import { useState, useCallback } from "react";
import { $fetch } from "@/lib/api";
import type { MarketType } from "../../../types/common";

interface OrderParams {
  symbol: string;
  side: "buy" | "sell";
  type: string;
  price?: number;
  amount: number;
  stopPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  leverage?: number;
  postOnly?: boolean;
  reduceOnly?: boolean;
  timeInForce?: string;
}

// Map pro trading order types to backend order types
function mapOrderType(type: string): string {
  switch (type) {
    case "limit":
      return "LIMIT";
    case "market":
      return "MARKET";
    case "stop_market":
      return "STOP_MARKET";
    case "stop_limit":
      return "STOP_LIMIT";
    case "bracket":
      return "BRACKET";
    default:
      return type.toUpperCase();
  }
}

interface OrderResult {
  id: string;
  status: string;
  symbol: string;
  side: string;
  type: string;
  price?: number;
  amount: number;
  filled?: number;
  remaining?: number;
  timestamp: number;
}

export function useOrderSubmit(marketType: MarketType) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<OrderResult | null>(null);

  const submit = useCallback(
    async (params: OrderParams): Promise<OrderResult> => {
      setIsSubmitting(true);
      setError(null);

      try {
        // Determine API endpoint based on market type
        const endpoint =
          marketType === "futures"
            ? "/api/futures/order"
            : marketType === "eco"
            ? "/api/ecosystem/order"
            : "/api/exchange/order";

        // Parse symbol into currency and pair (e.g., "BTC/USDT" -> ["BTC", "USDT"])
        const [currency, pair] = params.symbol.split("/");
        if (!currency || !pair) {
          throw new Error("Invalid symbol format");
        }

        // Transform params to match backend API expected format
        const orderPayload: Record<string, any> = {
          currency,
          pair,
          amount: params.amount,
          type: mapOrderType(params.type),
          side: params.side.toUpperCase(),
        };

        // Add price for limit orders
        if (params.price !== undefined) {
          orderPayload.price = params.price;
        }

        // Add stop price for stop orders
        if (params.stopPrice !== undefined) {
          orderPayload.stopPrice = params.stopPrice;
        }

        // Add take profit and stop loss for bracket orders
        if (params.takeProfitPrice !== undefined) {
          orderPayload.takeProfitPrice = params.takeProfitPrice;
        }
        if (params.stopLossPrice !== undefined) {
          orderPayload.stopLossPrice = params.stopLossPrice;
        }

        // Add leverage for futures
        if (params.leverage !== undefined) {
          orderPayload.leverage = params.leverage;
        }

        // Add advanced options if provided
        if (params.postOnly !== undefined) {
          orderPayload.postOnly = params.postOnly;
        }
        if (params.reduceOnly !== undefined) {
          orderPayload.reduceOnly = params.reduceOnly;
        }
        if (params.timeInForce !== undefined) {
          orderPayload.timeInForce = params.timeInForce;
        }

        // Use $fetch for consistent API handling and authentication
        const { data, error: fetchError } = await $fetch<any>({
          url: endpoint,
          method: "POST",
          body: orderPayload,
        });

        if (fetchError || !data) {
          throw new Error(fetchError || "Order failed");
        }

        const result: OrderResult = data.data || data;
        setLastOrder(result);

        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent("order-placed", { detail: result }));
        window.dispatchEvent(new CustomEvent("tp-order-updated", { detail: result }));

        return result;
      } catch (err: any) {
        const message = err.message || "Order submission failed";
        setError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [marketType]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submit,
    isSubmitting,
    error,
    lastOrder,
    clearError,
  };
}

export type UseOrderSubmitReturn = ReturnType<typeof useOrderSubmit>;
