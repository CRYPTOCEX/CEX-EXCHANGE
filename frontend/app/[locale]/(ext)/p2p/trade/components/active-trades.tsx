"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Constants in CAPITAL_LETTERS
const TRADE_TYPE = {
  BUY: "BUY",
  SELL: "SELL",
};
const TRADE_STATUS = {
  PENDING: "PENDING",
  PAYMENT_SENT: "PAYMENT_SENT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  DISPUTED: "DISPUTED",
  CANCELLED: "CANCELLED",
};
interface Trade {
  id: string;
  type: string;
  coin: string;
  amount: number;
  fiatAmount: number;
  price: number;
  counterparty: string;
  status: string;
  date: string;
  paymentMethod: string;
}
interface ActiveTradesProps {
  trades?: Trade[];
}
export function ActiveTrades({ trades = [] }: ActiveTradesProps) {
  const { toast } = useToast();
  const router = useRouter();
  const handleAction = (id: string, action: string) => {
    toast({
      title: `Trade ${action}`,
      description: `You have ${action.toLowerCase()} trade with ID: ${id}`,
    });
  };
  const viewTradeDetails = (id: string) => {
    router.push(`/p2p/trade/${id}`);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case TRADE_STATUS.PENDING:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case TRADE_STATUS.IN_PROGRESS:
      case TRADE_STATUS.PAYMENT_SENT:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case TRADE_STATUS.COMPLETED:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case TRADE_STATUS.DISPUTED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };
  const getProgressValue = (status: string) => {
    switch (status) {
      case TRADE_STATUS.PENDING:
        return 25;
      case TRADE_STATUS.PAYMENT_SENT:
      case TRADE_STATUS.IN_PROGRESS:
        return 50;
      case TRADE_STATUS.COMPLETED:
        return 100;
      case TRADE_STATUS.DISPUTED:
        return 75;
      default:
        return 0;
    }
  };
  return (
    <div className="space-y-4">
      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            You don't have any active trades
          </p>
          <Link href="/p2p/offer" className="mt-4">
            <Button>Find Offers</Button>
          </Link>
        </div>
      ) : (
        trades.map((trade) => {
          return (
            <div
              key={trade.id}
              className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {trade.counterparty.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-1">
                      {trade.counterparty}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Shield className="h-4 w-4 text-green-500 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified Trader</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started{" "}
                      {formatDistanceToNow(new Date(trade.date), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={getStatusColor(trade.status)}
                >
                  {trade.status.replace("_", " ").charAt(0).toUpperCase() +
                    trade.status.replace("_", " ").slice(1)}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span>Trade Progress</span>
                  <span>{getProgressValue(trade.status)}%</span>
                </div>
                <Progress
                  value={getProgressValue(trade.status)}
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium">
                    {trade.type === TRADE_TYPE.BUY ? "Buying" : "Selling"}{" "}
                    {trade.coin}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Amount</div>
                  <div className="font-medium">
                    {trade.amount} {trade.coin}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="font-medium">
                    ${trade.fiatAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewTradeDetails(trade.id)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </Button>

                <Button variant="outline" size="sm">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chat
                </Button>

                {trade.status === TRADE_STATUS.PENDING && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(trade.id, "Cancelled")}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(trade.id, "Confirmed")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Payment
                    </Button>
                  </>
                )}
                {(trade.status === TRADE_STATUS.IN_PROGRESS ||
                  trade.status === TRADE_STATUS.PAYMENT_SENT) && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(trade.id, "Disputed")}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Dispute
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(trade.id, "Completed")}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Release Crypto
                    </Button>
                  </>
                )}
                {trade.status === TRADE_STATUS.COMPLETED && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(trade.id, "Rated")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Rate Trader
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
