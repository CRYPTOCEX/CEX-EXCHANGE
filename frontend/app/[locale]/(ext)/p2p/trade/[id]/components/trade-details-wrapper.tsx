"use client";

import { useState, useEffect } from "react";
import { TradeDetails } from "./trade-details";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useTranslations } from "next-intl";

interface TradeDetailsWrapperProps {
  tradeId: string;
}

export function TradeDetailsWrapper({ tradeId }: TradeDetailsWrapperProps) {
  const t = useTranslations("ext");
  const { currentTrade, isLoadingTradeById, tradeByIdError, fetchTradeById } =
    useP2PStore();
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();

  useEffect(() => {
    const loadTradeDetails = async () => {
      try {
        await fetchTradeById(tradeId);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load trade details",
          variant: "destructive",
        });
      }
    };

    loadTradeDetails();

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchTradeById(tradeId);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [tradeId, fetchTradeById, toast]);

  if (isLoadingTradeById && !currentTrade) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tradeByIdError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-destructive mb-2">
              {t("error_loading_trade")}
            </h3>
            <p className="text-muted-foreground mb-6">{tradeByIdError}</p>

            <Link href="/p2p/trade">
              <Button>{t("return_to_trades")}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentTrade) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="rounded-full bg-muted p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t("trade_not_found")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("the_trade_youre_view_it")}.
            </p>
            <Link href="/p2p/trade" className="your-button-classes">
              {t("return_to_trades")}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TradeDetails
      tradeId={tradeId}
      initialData={currentTrade}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}
