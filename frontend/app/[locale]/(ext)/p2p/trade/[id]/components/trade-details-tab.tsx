"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TradeTimeline } from "./trade-timeline";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface TradeDetailsTabProps {
  trade: P2PTrade;
}

export function TradeDetailsTab({ trade }: TradeDetailsTabProps) {
  const t = useTranslations("ext");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Trade ID has been copied to your clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trade_details")}</CardTitle>
        <CardDescription>
          {t("complete_information_about_this_trade")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">{t("trade_id")}</p>
            <p className="font-medium">{trade.id}</p>
          </div>
          <button
            onClick={() => copyToClipboard(trade.id)}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("trade_type")}
              </p>
              <Badge
                variant={trade.type === "buy" ? "default" : "outline"}
                className={
                  trade.type === "buy"
                    ? ""
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                }
              >
                {trade.type === "buy" ? "Buy" : "Sell"} {trade.coin}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("Created")}
              </p>
              <p className="font-medium">
                {new Date(trade.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("last_updated")}
              </p>
              <p className="font-medium">
                {new Date(
                  trade.lastUpdated || trade.createdAt
                ).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("escrow_fee")}
              </p>
              <p className="font-medium">
                {trade.escrowFee || "0.1%"}
                (
                {(trade.total * 0.001).toFixed(2)} USD)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("payment_method")}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-muted">
                  {trade.paymentMethod}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("trade_terms")}
              </p>
              <p className="text-sm">
                {trade.terms || "No specific terms provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t("Counterparty")}
              </p>
              <p className="font-medium">{trade.counterparty.name}</p>
              <p className="text-xs text-muted-foreground">
                {trade.counterparty.completedTrades}
                {t("trades_•")} {trade.counterparty.completionRate}
                {t("%_completion_rate")}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <TradeTimeline events={trade.timeline} />
      </CardContent>
    </Card>
  );
}
