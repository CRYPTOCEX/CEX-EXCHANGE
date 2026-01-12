import { useState, useCallback } from "react";
import type { OrderSide } from "../SideToggle";
import type { OrderType } from "../OrderTypeSelector";
import type { AdvancedOptionsState } from "../advanced/AdvancedOptions";

const DEFAULT_ADVANCED_OPTIONS: AdvancedOptionsState = {
  postOnly: false,
  reduceOnly: false,
  timeInForce: "GTC",
};

export function useOrderForm(defaultOrderType: OrderType = "limit") {
  const [side, setSide] = useState<OrderSide>("buy");
  const [orderType, setOrderType] = useState<OrderType>(defaultOrderType);
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptionsState>(
    DEFAULT_ADVANCED_OPTIONS
  );

  const reset = useCallback(() => {
    setPrice("");
    setAmount("");
    setStopPrice("");
    setTakeProfitPrice("");
    setStopLossPrice("");
    // Keep side, orderType, leverage, and advanced options
  }, []);

  const resetAll = useCallback(() => {
    setSide("buy");
    setOrderType(defaultOrderType);
    setPrice("");
    setAmount("");
    setStopPrice("");
    setTakeProfitPrice("");
    setStopLossPrice("");
    setLeverage(1);
    setAdvancedOptions(DEFAULT_ADVANCED_OPTIONS);
  }, [defaultOrderType]);

  return {
    // State
    side,
    orderType,
    price,
    amount,
    stopPrice,
    takeProfitPrice,
    stopLossPrice,
    leverage,
    advancedOptions,

    // Setters
    setSide,
    setOrderType,
    setPrice,
    setAmount,
    setStopPrice,
    setTakeProfitPrice,
    setStopLossPrice,
    setLeverage,
    setAdvancedOptions,

    // Actions
    reset,
    resetAll,
  };
}

export type UseOrderFormReturn = ReturnType<typeof useOrderForm>;
