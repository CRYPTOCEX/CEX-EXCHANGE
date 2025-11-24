"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target, 
  Calculator,
  AlertTriangle,
  Info,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import type { FuturesMarket, WalletData } from "./types";

interface MarketOrderFormProps {
  symbol: string;
  currency: string;
  pair: string;
  currentPrice: number | null;
  marketPrice: string;
  pricePrecision: number;
  amountPrecision: number;
  walletData: WalletData | null;
  priceDirection: "up" | "down" | "neutral";
  onOrderSubmit?: (order: any) => Promise<any>;
  fetchWalletData: () => void;
  marketInfo: FuturesMarket | null;
  fundingRate: number | null;
  fundingTime: string;
  formatPrice: (price: number | null) => string;
}

export default function MarketOrderForm({
  symbol,
  currency,
  pair,
  currentPrice,
  marketPrice,
  pricePrecision,
  amountPrecision,
  walletData,
  priceDirection,
  onOrderSubmit,
  fetchWalletData,
  marketInfo,
  fundingRate,
  fundingTime,
  formatPrice,
}: MarketOrderFormProps) {
  const t = useTranslations("trade/components/trading/futures/market-order-form");
  
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [orderType, setOrderType] = useState<"long" | "short">("long");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Enhanced Stop Loss and Take Profit states
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [slPercentage, setSlPercentage] = useState("");
  const [tpPercentage, setTpPercentage] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState<number | null>(null);
  const [estimatedLoss, setEstimatedLoss] = useState<number | null>(null);
  const [estimatedProfit, setEstimatedProfit] = useState<number | null>(null);

  // Quick amount buttons
  const quickAmounts = [100, 500, 1000, 5000];

  // Max leverage from market info metadata
  const maxLeverage = marketInfo?.metadata?.limits?.leverage 
    ? parseInt(marketInfo.metadata.limits.leverage) 
    : 100;

  // Calculate position value
  const positionValue = currentPrice && amount ? (Number(amount) * currentPrice * leverage) : 0;
  const margin = positionValue / leverage;
  const fee = positionValue * 0.0004; // 0.04% market order fee

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Calculate Stop Loss/Take Profit based on percentage
  const calculateSLTP = useCallback(() => {
    if (!currentPrice || !amount) return;

    const price = currentPrice;
    const isLong = orderType === "long";

    // Calculate Stop Loss
    if (slPercentage) {
      const slPercent = Number(slPercentage);
      const slPrice = isLong 
        ? price * (1 - slPercent / 100) 
        : price * (1 + slPercent / 100);
      setStopLoss(slPrice.toFixed(pricePrecision));
      
      // Calculate estimated loss
      const loss = Number(amount) * Math.abs(price - slPrice) * leverage;
      setEstimatedLoss(loss);
    }

    // Calculate Take Profit
    if (tpPercentage) {
      const tpPercent = Number(tpPercentage);
      const tpPrice = isLong 
        ? price * (1 + tpPercent / 100) 
        : price * (1 - tpPercent / 100);
      setTakeProfit(tpPrice.toFixed(pricePrecision));
      
      // Calculate estimated profit
      const profit = Number(amount) * Math.abs(tpPrice - price) * leverage;
      setEstimatedProfit(profit);
    }

    // Calculate Risk/Reward Ratio
    if (slPercentage && tpPercentage) {
      const ratio = Number(tpPercentage) / Number(slPercentage);
      setRiskRewardRatio(ratio);
    }
  }, [currentPrice, amount, orderType, slPercentage, tpPercentage, leverage, pricePrecision]);

  // Recalculate when dependencies change
  useEffect(() => {
    calculateSLTP();
  }, [calculateSLTP]);

  // Handle SL percentage change
  const handleSLPercentageChange = (value: string) => {
    setSlPercentage(value);
    if (value && currentPrice) {
      const percent = Number(value);
      const isLong = orderType === "long";
      const slPrice = isLong 
        ? currentPrice * (1 - percent / 100) 
        : currentPrice * (1 + percent / 100);
      setStopLoss(slPrice.toFixed(pricePrecision));
    }
  };

  // Handle TP percentage change
  const handleTPPercentageChange = (value: string) => {
    setTpPercentage(value);
    if (value && currentPrice) {
      const percent = Number(value);
      const isLong = orderType === "long";
      const tpPrice = isLong 
        ? currentPrice * (1 + percent / 100) 
        : currentPrice * (1 - percent / 100);
      setTakeProfit(tpPrice.toFixed(pricePrecision));
    }
  };

  // Handle direct SL price change
  const handleSLPriceChange = (value: string) => {
    setStopLoss(value);
    if (value && currentPrice) {
      const slPrice = Number(value);
      const isLong = orderType === "long";
      const percent = isLong 
        ? ((currentPrice - slPrice) / currentPrice) * 100
        : ((slPrice - currentPrice) / currentPrice) * 100;
      setSlPercentage(Math.abs(percent).toFixed(2));
    }
  };

  // Handle direct TP price change
  const handleTPPriceChange = (value: string) => {
    setTakeProfit(value);
    if (value && currentPrice) {
      const tpPrice = Number(value);
      const isLong = orderType === "long";
      const percent = isLong 
        ? ((tpPrice - currentPrice) / currentPrice) * 100
        : ((currentPrice - tpPrice) / currentPrice) * 100;
      setTpPercentage(Math.abs(percent).toFixed(2));
    }
  };

  // Quick SL/TP percentage buttons
  const quickSLPercentages = [1, 2, 5, 10];
  const quickTPPercentages = [2, 5, 10, 20];

  // Risk level indicator
  const getRiskLevel = () => {
    if (!riskRewardRatio) return null;
    if (riskRewardRatio >= 3) return { level: "Low", color: "text-green-500", bg: "bg-green-500/10" };
    if (riskRewardRatio >= 2) return { level: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    return { level: "High", color: "text-red-500", bg: "bg-red-500/10" };
  };

  const riskLevel = getRiskLevel();

  const handleSubmit = async () => {
    if (!amount || !currentPrice) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      const orderData = {
        symbol,
        side: orderType.toUpperCase(),
        type: "MARKET",
        amount: Number(amount),
        leverage,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
      };

      await $fetch({
        url: `/api/futures/order`,
        method: "POST",
        body: orderData,
      });

      setSuccessMessage(t("order_placed_successfully"));
      setAmount("");
      setStopLoss("");
      setTakeProfit("");
      setSlPercentage("");
      setTpPercentage("");
      onOrderSubmit?.(orderData);
      fetchWalletData?.();
    } catch (error: any) {
      setOrderError(error.message || t("order_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Current Price Display */}
      <div className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-md">
        <span className="text-xs text-muted-foreground">{t("current_price")}</span>
        <div className="flex items-center gap-1">
          {priceDirection === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {priceDirection === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          <span className="text-sm font-medium">
            {currentPrice ? `${currentPrice.toFixed(pricePrecision)}` : "$0.00"}
          </span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("amount")} ({currency})</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step={`0.${"0".repeat(amountPrecision - 1)}1`}
        />
        
        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              onClick={() => setAmount(quickAmount.toString())}
              className="text-xs h-7"
            >
              ${quickAmount}
            </Button>
          ))}
        </div>
      </div>

      {/* Leverage Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label className="text-xs">{t("leverage")}</Label>
          <Badge variant="outline" className="text-xs">
            {leverage}x
          </Badge>
        </div>
        <Slider
          value={[leverage]}
          onValueChange={(value) => setLeverage(value[0])}
          max={maxLeverage}
          min={1}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1x</span>
          <span>{maxLeverage}x</span>
        </div>
      </div>

      {/* Advanced Stop Loss Section */}
      <Card className="p-3 space-y-3 border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-500" />
          <Label className="text-xs font-medium text-red-600 dark:text-red-400">
            {t("stop_loss")} (Optional)
          </Label>
        </div>
        
        {/* SL Percentage Input */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("percentage")}</Label>
            <div className="relative">
              <Input
                type="number"
                value={slPercentage}
                onChange={(e) => handleSLPercentageChange(e.target.value)}
                placeholder="0.00"
                className="pr-8"
                min="0"
                max="50"
                step="0.1"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("price")}</Label>
            <Input
              type="number"
              value={stopLoss}
              onChange={(e) => handleSLPriceChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step={`0.${"0".repeat(pricePrecision - 1)}1`}
            />
          </div>
        </div>

        {/* Quick SL Percentage Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {quickSLPercentages.map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              onClick={() => handleSLPercentageChange(percent.toString())}
              className="text-xs h-6 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              {percent}%
            </Button>
          ))}
        </div>

        {/* Estimated Loss */}
        {estimatedLoss && (
          <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {t("estimated_loss")}
            </span>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              -${estimatedLoss.toFixed(2)}
            </span>
          </div>
        )}
      </Card>

      {/* Advanced Take Profit Section */}
      <Card className="p-3 space-y-3 border-green-200 dark:border-green-900/50">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-green-500" />
          <Label className="text-xs font-medium text-green-600 dark:text-green-400">
            {t("take_profit")} (Optional)
          </Label>
        </div>
        
        {/* TP Percentage Input */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("percentage")}</Label>
            <div className="relative">
              <Input
                type="number"
                value={tpPercentage}
                onChange={(e) => handleTPPercentageChange(e.target.value)}
                placeholder="0.00"
                className="pr-8"
                min="0"
                max="1000"
                step="0.1"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("price")}</Label>
            <Input
              type="number"
              value={takeProfit}
              onChange={(e) => handleTPPriceChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step={`0.${"0".repeat(pricePrecision - 1)}1`}
            />
          </div>
        </div>

        {/* Quick TP Percentage Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {quickTPPercentages.map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              onClick={() => handleTPPercentageChange(percent.toString())}
              className="text-xs h-6 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
            >
              {percent}%
            </Button>
          ))}
        </div>

        {/* Estimated Profit */}
        {estimatedProfit && (
          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Target className="h-3 w-3" />
              {t("estimated_profit")}
            </span>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              +${estimatedProfit.toFixed(2)}
            </span>
          </div>
        )}
      </Card>

      {/* Risk/Reward Analysis */}
      {riskRewardRatio && riskLevel && (
        <Card className={cn("p-3 space-y-2", riskLevel.bg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="text-xs font-medium">{t("risk_reward_analysis")}</span>
            </div>
            <Badge variant="outline" className={cn("text-xs", riskLevel.color)}>
              {riskLevel.level} Risk
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("ratio")}:</span>
              <span className="font-medium">1:{riskRewardRatio.toFixed(2)}</span>
            </div>
            {estimatedLoss && estimatedProfit && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("net_potential")}:</span>
                <span className={cn("font-medium", 
                  estimatedProfit > estimatedLoss ? "text-green-600" : "text-red-600"
                )}>
                  ${(estimatedProfit - estimatedLoss).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Position Information */}
      {amount && currentPrice && (
        <div className="space-y-1 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-md text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("position_value")}:</span>
            <span className="font-medium">${positionValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("margin")}:</span>
            <span className="font-medium">${margin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("fees")}:</span>
            <span className="font-medium">${fee.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Order Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            setOrderType("long");
            handleSubmit();
          }}
          disabled={!amount || !currentPrice || isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white h-10"
        >
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            {isSubmitting && orderType === "long" ? (
              <Zap className="h-3 w-3 animate-spin" />
            ) : (
              t("long")
            )}
          </div>
        </Button>
        
        <Button
          onClick={() => {
            setOrderType("short");
            handleSubmit();
          }}
          disabled={!amount || !currentPrice || isSubmitting}
          className="bg-red-600 hover:bg-red-700 text-white h-10"
        >
          <div className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4" />
            {isSubmitting && orderType === "short" ? (
              <Zap className="h-3 w-3 animate-spin" />
            ) : (
              t("short")
            )}
          </div>
        </Button>
      </div>

      {/* Error Message */}
      {orderError && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-500 text-xs flex items-center gap-2">
          <AlertTriangle className="h-3 w-3" />
          {orderError}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-md text-green-500 text-xs flex items-center gap-2">
          <Info className="h-3 w-3" />
          {successMessage}
        </div>
      )}

      {/* Risk Warning */}
      <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-yellow-600 dark:text-yellow-400 text-xs flex items-start gap-2">
        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>
          {t("futures_trading_involves_substantial_risk_leverage_can_work_against_you_as_well_as_for_you")}
        </span>
      </div>
    </div>
  );
} 