"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  User,
  Settings,
  ArrowLeft,
  Play,
  Pause,
  StopCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";

interface FollowerData {
  id: string;
  userId: string;
  leaderId: string;
  copyMode: "PROPORTIONAL" | "FIXED_AMOUNT" | "FIXED_RATIO";
  fixedAmount: number | null;
  fixedRatio: number | null;
  maxDailyLoss: number | null;
  maxPositionSize: number | null;
  stopLossPercent: number | null;
  takeProfitPercent: number | null;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  roi: number;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  leader: {
    id: string;
    displayName: string;
    avatar: string | null;
    tradingStyle: string | null;
    riskLevel: string | null;
    profitSharePercent: number | null;
  };
  trades: any[];
  transactions: any[];
}

export default function CopyTradingFollowerDetailClient() {
  const params = useParams();
  const id = params?.id as string;
  const [follower, setFollower] = useState<FollowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFollower();
    }
  }, [id]);

  const fetchFollower = async () => {
    setLoading(true);
    const { data, error } = await $fetch({
      url: `/api/admin/copy-trading/follower/${id}`,
      method: "GET",
      silentSuccess: true,
    });

    if (error) {
      toast.error(
        (error as any)?.message || "Failed to fetch follower details"
      );
    } else if (data) {
      setFollower(data);
    }
    setLoading(false);
  };

  const handleAction = async (action: "resume" | "pause" | "stop") => {
    setActionLoading(true);
    const endpoint = action === "pause" ? "stop" : action;
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/follower/${id}/${endpoint}`,
      method: "POST",
    });

    if (error) {
      toast.error(
        (error as any)?.message || `Failed to ${action} subscription`
      );
    } else {
      toast.success(`Subscription ${action}d successfully`);
      fetchFollower();
    }
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "success" | "warning" | "destructive"
    > = {
      ACTIVE: "success",
      PAUSED: "warning",
      STOPPED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getCopyModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      PROPORTIONAL: "Proportional",
      FIXED_AMOUNT: "Fixed Amount",
      FIXED_RATIO: "Fixed Ratio",
    };
    return labels[mode] || mode;
  };

  const getTradeStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "success" | "warning" | "destructive"
    > = {
      OPEN: "default",
      CLOSED: "success",
      PENDING: "warning",
      FAILED: "destructive",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading follower details...</div>
      </div>
    );
  }

  if (!follower) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Follower not found</div>
      </div>
    );
  }

  const isPositiveRoi = (follower.roi ?? 0) >= 0;

  return (
    <div className="container pt-24 pb-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/copy-trading/follower">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Follower Details</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor follower subscription
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {follower.status === "PAUSED" && (
            <Button
              onClick={() => handleAction("resume")}
              disabled={actionLoading}
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          {follower.status === "ACTIVE" && (
            <Button
              onClick={() => handleAction("pause")}
              disabled={actionLoading}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {follower.status !== "STOPPED" && (
            <Button
              onClick={() => handleAction("stop")}
              disabled={actionLoading}
              variant="destructive"
              size="sm"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* User & Leader Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {follower.user.avatar && (
                <AvatarImage src={follower.user.avatar} />
              )}
              <AvatarFallback>
                {follower.user.firstName?.[0]}
                {follower.user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">
                  {follower.user.firstName} {follower.user.lastName}
                </h3>
                {getStatusBadge(follower.status)}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {follower.user.email}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div>
                  <User className="h-4 w-4 inline mr-1" />
                  Follower
                </div>
                <div>
                  Started {formatDistanceToNow(new Date(follower.createdAt))}{" "}
                  ago
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Leader Info */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {follower.leader.avatar && (
                <AvatarImage src={follower.leader.avatar} />
              )}
              <AvatarFallback>
                {follower.leader.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                {follower.leader.displayName}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Following this leader
              </p>
              <div className="flex items-center gap-4 text-sm">
                {follower.leader.tradingStyle && (
                  <Badge variant="outline">
                    {follower.leader.tradingStyle}
                  </Badge>
                )}
                {follower.leader.riskLevel && (
                  <Badge variant="outline">{follower.leader.riskLevel}</Badge>
                )}
              </div>
              {follower.leader.profitSharePercent !== null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Profit Share: {follower.leader.profitSharePercent}%
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ROI</p>
              <p
                className={`text-2xl font-bold ${
                  isPositiveRoi ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositiveRoi ? "+" : ""}
                {(follower.roi ?? 0).toFixed(2)}%
              </p>
            </div>
            {isPositiveRoi ? (
              <TrendingUp className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-600" />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">
                {(follower.winRate ?? 0).toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{follower.totalTrades ?? 0}</p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p
                className={`text-2xl font-bold ${
                  (follower.totalProfit ?? 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {(follower.totalProfit ?? 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Copy Trading Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Copy Mode</p>
            <p className="font-medium">{getCopyModeLabel(follower.copyMode)}</p>
          </div>
          {follower.fixedAmount !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Fixed Amount</p>
              <p className="font-medium">{follower.fixedAmount}</p>
            </div>
          )}
          {follower.fixedRatio !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Fixed Ratio</p>
              <p className="font-medium">{follower.fixedRatio}x</p>
            </div>
          )}
          {follower.maxDailyLoss !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Max Daily Loss</p>
              <p className="font-medium">{follower.maxDailyLoss}</p>
            </div>
          )}
          {follower.maxPositionSize !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Max Position Size</p>
              <p className="font-medium">{follower.maxPositionSize}</p>
            </div>
          )}
          {follower.stopLossPercent !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Stop Loss</p>
              <p className="font-medium">{follower.stopLossPercent}%</p>
            </div>
          )}
          {follower.takeProfitPercent !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Take Profit</p>
              <p className="font-medium">{follower.takeProfitPercent}%</p>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs for Trades and Transactions */}
      <Tabs defaultValue="trades" className="w-full">
        <TabsList>
          <TabsTrigger value="trades">
            Trades ({follower.trades?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({follower.transactions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="mt-4">
          <Card className="p-6">
            {follower.trades && follower.trades.length > 0 ? (
              <div className="space-y-4">
                {follower.trades.map((trade: any) => (
                  <div
                    key={trade.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{trade.symbol}</span>
                        <Badge
                          variant={
                            trade.side === "BUY" ? "success" : "destructive"
                          }
                        >
                          {trade.side}
                        </Badge>
                        {getTradeStatusBadge(trade.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Amount: {trade.amount} @ {trade.price} • Cost:{" "}
                        {trade.cost}
                      </div>
                      {trade.profit !== null && (
                        <div
                          className={`text-sm font-medium ${
                            trade.profit >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Profit: {trade.profit >= 0 ? "+" : ""}
                          {trade.profit.toFixed(2)} (
                          {trade.profitPercent?.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(trade.createdAt))} ago
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No trades found
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card className="p-6">
            {follower.transactions && follower.transactions.length > 0 ? (
              <div className="space-y-4">
                {follower.transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{tx.type}</span>
                        <Badge
                          variant={
                            tx.status === "COMPLETED"
                              ? "success"
                              : tx.status === "FAILED"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Amount: {tx.amount} {tx.currency}
                        {tx.fee > 0 && ` • Fee: ${tx.fee}`}
                      </div>
                      {tx.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {tx.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.createdAt))} ago
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
