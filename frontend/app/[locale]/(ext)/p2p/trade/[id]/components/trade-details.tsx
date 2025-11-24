"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Clock, Shield } from "lucide-react";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useTranslations } from "next-intl";

interface TradeDetailsProps {
  tradeId: string;
  initialData: P2PTrade;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function TradeDetails({
  tradeId,
  initialData,
  activeTab,
  setActiveTab,
}: TradeDetailsProps) {
  const t = useTranslations("ext");
  const [trade, setTrade] = useState<P2PTrade>(initialData);

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

  const handleDisputeTrade = async (): Promise<void> => {
    const success = await disputeTrade(
      tradeId,
      "User dispute",
      "Trade dispute initiated by user"
    );
    if (success) {
      // Update local state with the new status
      setTrade((prev) => ({
        ...prev,
        status: "disputed",
      }));
    }
  };

  // Calculate time remaining if applicable
  const getTimeRemaining = () => {
    if (trade.status === "waiting_payment") {
      const createdTime = new Date(trade.createdAt).getTime();
      const currentTime = new Date().getTime();
      const timeLimit = 30 * 60 * 1000; // 30 minutes in milliseconds
      const timeElapsed = currentTime - createdTime;
      const timeRemaining = timeLimit - timeElapsed;

      if (timeRemaining > 0) {
        const minutes = Math.floor(timeRemaining / (60 * 1000));
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);
        return `${minutes}m ${seconds}s`;
      }
      return "Expired";
    }
    return null;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="space-y-6">
      {/* Main Trade Card */}
      <Card className="overflow-hidden border-primary/10">
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
          />

          {/* Time Remaining Alert */}
          {timeRemaining && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-center justify-between mt-4 mb-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    {t("time_remaining")}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("complete_this_trade_step_before_time_expires")}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
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
      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <h3 className="text-sm font-medium mb-1">
            {t("escrow_protected_trade")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("this_trade_is_escrow_system")}.{" "}
            {t("the_cryptocurrency_is_is_complete")}.
          </p>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">{t("Details")}</TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            {t("Chat")}
            {activeTab !== "chat" && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment">{t("Payment")}</TabsTrigger>
          <TabsTrigger value="escrow">{t("Escrow")}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="details"
          className="space-y-4 mt-6 animate-in fade-in-50"
        >
          <TradeDetailsTab trade={trade} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6 animate-in fade-in-50">
          <TradeChat tradeId={tradeId} counterparty={trade.counterparty} />
        </TabsContent>

        <TabsContent value="payment" className="mt-6 animate-in fade-in-50">
          <TradePayment trade={trade} onConfirmPayment={handleConfirmPayment} />
        </TabsContent>

        <TabsContent value="escrow" className="mt-6 animate-in fade-in-50">
          <TradeEscrow
            trade={trade}
            onReleaseFunds={handleReleaseFunds}
            onDisputeTrade={handleDisputeTrade}
          />
        </TabsContent>
      </Tabs>

      {/* Dispute Section */}
      {trade.status !== "disputed" && trade.status !== "completed" && (
        <div className="mt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                {t("report_problem_with_this_trade")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("report_a_problem")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("are_you_sure_is_resolved")}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDisputeTrade()}
                  className="bg-destructive text-destructive-foreground"
                >
                  {t("open_dispute")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Rating Section */}
      {trade.status === "completed" && (
        <TradeRating tradeId={tradeId} counterparty={trade.counterparty} />
      )}
    </div>
  );
}
