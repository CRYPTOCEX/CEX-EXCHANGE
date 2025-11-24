"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { TradeTimer } from "./trade-timer";
import { TradeStatusBadge } from "./trade-status-badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Shield, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface TradeHeaderProps {
  tradeId: string;
  type: "buy" | "sell";
  coin: string;
  amount: number;
  createdAt: string;
  lastUpdated?: string;
  status: string;
  counterparty: P2PTradeCounterparty;
}

export function TradeHeader({
  type,
  coin,
  amount,
  createdAt,
  lastUpdated,
  status,
  counterparty,
}: TradeHeaderProps) {
  const t = useTranslations("ext");
  return (
    <div className="pb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">
              {type === "buy" ? "Buying" : "Selling"} {amount} {coin}
            </CardTitle>
            <TradeStatusBadge status={status} />
          </div>
          <CardDescription className="mt-1">
            {t("trade_started")}
            {new Date(createdAt).toLocaleString()}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <MessageCircle className="mr-2 h-4 w-4" />
            {t("Chat")}
          </Button>
          <Button variant="outline" size="sm" className="hidden md:flex">
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("view_blockchain")}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarImage
              src={counterparty.avatar || "/placeholder.svg"}
              alt={counterparty.name}
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              {counterparty.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center">
              <p className="font-medium">{counterparty.name}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Shield className="h-4 w-4 text-green-500 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("verified_trader")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="flex mr-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.floor(counterparty.completionRate / 20)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span>
                {counterparty.completedTrades}
                {t("trades_•")} {counterparty.completionRate}
                {t("%_completion")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <TradeTimer
            startTime={lastUpdated || createdAt}
            timeLimit={30} // 30 minutes
            status={status}
          />
        </div>
      </div>
    </div>
  );
}
