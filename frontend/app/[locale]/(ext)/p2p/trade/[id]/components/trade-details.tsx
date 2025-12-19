"use client";

import { useState, useEffect, RefObject } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeHeader } from "./trade-header";
import { TradeProgress } from "./trade-progress";
import { TradeInfo } from "./trade-info";
import { TradeAlerts } from "./trade-alerts";
import { TradeActions } from "./trade-actions";
import { TradeDetailsTab } from "./trade-details-tab";
import { TradeChat } from "./trade-chat";
import { TradeEscrow } from "./trade-escrow";
import { TradePayment } from "./trade-payment";
import { TradeRating } from "./trade-rating";
import { DisputeDialog } from "./dispute-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Shield } from "lucide-react";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useTranslations } from "next-intl";
import { canDispute, isDisputed } from "@/utils/p2p-status";

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
  isAdminMessage?: boolean;
}

interface TradeDetailsProps {
  tradeId: string;
  initialData: P2PTrade;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabsRef?: RefObject<HTMLDivElement | null>;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function TradeDetails({
  tradeId,
  initialData,
  activeTab,
  setActiveTab,
  tabsRef,
  messages = [],
  setMessages,
}: TradeDetailsProps) {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [trade, setTrade] = useState<P2PTrade>(initialData);

  // Sync local state with initialData when it changes (e.g., from WebSocket updates)
  // We specifically watch status, timeline, and key timestamps to trigger re-render
  useEffect(() => {
    if (initialData) {
      setTrade(initialData);
    }
  }, [initialData, initialData?.status, initialData?.timeline, initialData?.paymentConfirmedAt, initialData?.completedAt, initialData?.cancelledAt]);

  // Use the existing p2p store
  const {
    confirmPayment,
    releaseFunds,
    cancelTrade,
    disputeTrade,
    isConfirmingPayment,
    isReleasingFunds,
    isCancellingTrade,
    isDisputingTrade,
  } = useP2PStore();

  // Combine loading states
  const loading =
    isConfirmingPayment ||
    isReleasingFunds ||
    isCancellingTrade ||
    isDisputingTrade;

  // Create handler functions that update the local trade state
  const handleConfirmPayment = async (): Promise<void> => {
    const success = await confirmPayment(tradeId);
    if (success) {
      // Update local state with the new status
      setTrade((prev) => ({
        ...prev,
        status: "payment_confirmed",
      }));
    }
  };

  const handleReleaseFunds = async (): Promise<void> => {
    const success = await releaseFunds(tradeId);
    if (success) {
      // Update local state with the new status
      setTrade((prev) => ({
        ...prev,
        status: "completed",
      }));
    }
  };

  const handleCancelTrade = async (): Promise<void> => {
    const success = await cancelTrade(tradeId, "User cancelled");
    if (success) {
      // Update local state with the new status
      setTrade((prev) => ({
        ...prev,
        status: "cancelled",
      }));
    }
  };

  const handleDisputeTrade = async (reason: string, description: string): Promise<void> => {
    const success = await disputeTrade(
      tradeId,
      reason,
      description
    );
    if (success) {
      // Update local state with the new status
      setTrade((prev) => ({
        ...prev,
        status: "disputed",
      }));
    }
  };

  // Get payment window from offer settings or use default (240 minutes)
  const paymentWindow = trade.paymentWindow ||
    trade.offer?.tradeSettings?.autoCancel ||
    trade.offer?.tradeSettings?.paymentWindow ||
    240; // Default to 240 minutes (4 hours) if not specified

  // Calculate time remaining if applicable
  const getTimeRemaining = () => {
    if (trade.status === "waiting_payment" || trade.status === "pending") {
      const createdTime = new Date(trade.createdAt).getTime();
      const currentTime = new Date().getTime();
      const timeLimit = paymentWindow * 60 * 1000; // Convert minutes to milliseconds
      const timeElapsed = currentTime - createdTime;
      const timeRemaining = timeLimit - timeElapsed;

      if (timeRemaining > 0) {
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
        if (hours > 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        }
        return `${minutes}m ${seconds}s`;
      }
      return "Expired";
    }
    return null;
  };

  const timeRemaining = getTimeRemaining();

  // Handle chat button click - switch to chat tab and scroll to tabs section
  const handleChatClick = () => {
    setActiveTab("chat");
    // Small delay to ensure tab change is processed
    setTimeout(() => {
      tabsRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Main Trade Card */}
      <Card className={`overflow-hidden border-zinc-200 dark:border-zinc-800`}>
        <CardContent className="p-6 pt-6">
          <TradeHeader
            tradeId={tradeId}
            type={trade.type}
            coin={trade.coin}
            amount={trade.amount}
            createdAt={trade.createdAt}
            lastUpdated={trade.lastUpdated}
            status={trade.status}
            counterparty={trade.counterparty}
            paymentWindow={paymentWindow}
            onChatClick={handleChatClick}
          />

          {/* Time Remaining Alert */}
          {timeRemaining && (
            <div className={`bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-center justify-between mt-4 mb-4`}>
              <div className="flex items-center">
                <Clock className={`h-5 w-5 text-amber-700 dark:text-amber-400 mr-2`} />
                <div>
                  <p className={`text-sm font-medium text-amber-700 dark:text-amber-400`}>
                    {tExt("time_remaining")}
                  </p>
                  <p className={`text-xs text-amber-700 dark:text-amber-400`}>
                    {t("complete_this_trade_step_before_time_expires")}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400`}
              >
                {timeRemaining}
              </Badge>
            </div>
          )}

          <div className="space-y-6">
            <TradeProgress status={trade.status} />

            <TradeInfo
              amount={trade.amount}
              coin={trade.coin}
              price={trade.price}
              total={trade.total}
              priceCurrency={trade.offer?.priceCurrency}
            />

            <TradeAlerts status={trade.status} type={trade.type} />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between p-6 pt-0 flex-wrap gap-2">
          <TradeActions
            status={trade.status}
            type={trade.type}
            loading={loading}
            onConfirmPayment={handleConfirmPayment}
            onReleaseFunds={handleReleaseFunds}
            onCancelTrade={handleCancelTrade}
            onDisputeTrade={handleDisputeTrade}
          />
        </CardFooter>
      </Card>

      {/* Security Notice */}
      <div className={`bg-blue-500/5 border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-start gap-3`}>
        <Shield className={`h-5 w-5 text-blue-500 mt-0.5`} />
        <div>
          <h3 className="text-sm font-medium mb-1">
            {t("escrow_protected_trade")}
          </h3>
          <p className={`text-xs text-zinc-600 dark:text-zinc-400`}>
            {t("this_trade_is_escrow_system")}.{" "}
            {t("the_cryptocurrency_is_is_complete")}.
          </p>
        </div>
      </div>

      {/* Tabs Section */}
      <div ref={tabsRef}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">{tCommon("details")}</TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            {tCommon("chat")}
            {activeTab !== "chat" && (
              <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500`}></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment">{tCommon("payment")}</TabsTrigger>
          <TabsTrigger value="escrow">{t("escrow")}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="details"
          className="space-y-4 mt-6 animate-in fade-in-50"
        >
          <TradeDetailsTab trade={trade} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6 animate-in fade-in-50">
          <TradeChat
            tradeId={tradeId}
            counterparty={trade.counterparty}
            wsMessages={messages}
            onNewMessage={setMessages ? (msg) => setMessages(prev => [...prev, msg]) : undefined}
          />
        </TabsContent>

        <TabsContent value="payment" className="mt-6 animate-in fade-in-50">
          <TradePayment trade={trade} onConfirmPayment={handleConfirmPayment} />
        </TabsContent>

        <TabsContent value="escrow" className="mt-6 animate-in fade-in-50">
          <TradeEscrow
            trade={trade}
            onReleaseFunds={handleReleaseFunds}
            onDisputeTrade={handleDisputeTrade}
            loading={loading}
          />
        </TabsContent>
        </Tabs>
      </div>

      {/* Dispute Section - Only show when dispute is allowed by backend rules */}
      {canDispute(trade.status) && !isDisputed(trade.status) && (
        <div className="mt-6">
          <DisputeDialog onSubmit={handleDisputeTrade} loading={loading} userRole={trade.type === "buy" ? "buyer" : "seller"}>
            <Button
              variant="outline"
              className={`w-full border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              {t("report_problem_with_this_trade")}
            </Button>
          </DisputeDialog>
        </div>
      )}

      {/* Rating Section */}
      {trade.status === "completed" && (
        <TradeRating tradeId={tradeId} counterparty={trade.counterparty} />
      )}
    </div>
  );
}
