"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Activity,
  DollarSign,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { useTranslations } from "next-intl";

interface Leader {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  tradingStyle: string;
  riskLevel: string;
  status: string;
  isPublic: boolean;
  winRate: number;
  roi: number;
  totalTrades: number;
  totalProfit: number;
  totalVolume: number;
  totalFollowers: number;
  profitSharePercent: number;
  minFollowAmount: number;
  maxFollowers: number;
  createdAt: string;
  rejectionReason?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  };
  followers?: any[];
  trades?: any[];
}

export default function LeaderDetailClient() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const leaderId = params.id as string;

  const [leader, setLeader] = useState<Leader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
  }>({ open: false, action: "", title: "" });
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeader = async () => {
    const { data } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}`,
      method: "GET",
      silent: true,
    });
    setLeader(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (leaderId) {
      fetchLeader();
    }
  }, [leaderId]);

  const handleAction = async () => {
    if (!actionDialog.action) return;

    const needsReason = ["reject", "suspend"].includes(actionDialog.action);
    if (needsReason && !actionReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    setIsSubmitting(true);
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}/${actionDialog.action}`,
      method: "POST",
      body: needsReason ? { reason: actionReason } : undefined,
    });

    if (!error) {
      setActionDialog({ open: false, action: "", title: "" });
      setActionReason("");
      fetchLeader();
    }
    setIsSubmitting(false);
  };

  const handleRecalculate = async () => {
    const { error } = await $fetch({
      url: `/api/admin/copy-trading/leader/${leaderId}/recalculate`,
      method: "POST",
    });

    if (!error) {
      fetchLeader();
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      ACTIVE: "bg-green-100 text-green-700",
      SUSPENDED: "bg-red-100 text-red-700",
      REJECTED: "bg-gray-100 text-gray-700",
      INACTIVE: "bg-gray-100 text-gray-700",
    };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!leader) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">{tExt("leader_not_found")}</p>
      </div>
    );
  }

  const avatar = leader.avatar || leader.user?.avatar;
  const initials = leader.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPositiveRoi = (leader.roi ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className={`container ${PAGE_PADDING}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-700 shadow-lg">
                <AvatarImage src={avatar} alt={leader.displayName} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {leader.displayName}
                  </h1>
                  {getStatusBadge(leader.status)}
                  {!leader.isPublic && (
                    <Badge variant="secondary">Hidden</Badge>
                  )}
                </div>

                <div className="text-sm text-zinc-500 mb-2">
                  {leader.user?.firstName} {leader.user?.lastName} •{" "}
                  {leader.user?.email}
                </div>

                {leader.bio && (
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    {leader.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                  <span>{leader.tradingStyle.replace("_", " ")}</span>
                  <span>•</span>
                  <span>{leader.riskLevel} Risk</span>
                  <span>•</span>
                  <span>
                    {leader.profitSharePercent}% {tCommon("profit_share")}
                  </span>
                  <span>•</span>
                  <span>
                    {t("min_1")}
                    {leader.minFollowAmount}
                  </span>
                  <span>•</span>
                  <span>
                    {t("applied_1")}:{" "}
                    {new Date(leader.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {leader.rejectionReason && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400">
                    <strong>{tCommon("rejection_reason")}:</strong>{" "}
                    {leader.rejectionReason}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {leader.status === "PENDING" && (
                  <>
                    <Button
                      onClick={() =>
                        setActionDialog({
                          open: true,
                          action: "approve",
                          title: "Approve Leader",
                        })
                      }
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        setActionDialog({
                          open: true,
                          action: "reject",
                          title: "Reject Leader",
                        })
                      }
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {leader.status === "ACTIVE" && (
                  <Button
                    variant="outline"
                    className="text-yellow-600 border-yellow-600"
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: "suspend",
                        title: "Suspend Leader",
                      })
                    }
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>
                )}
                {leader.status === "SUSPENDED" && (
                  <Button
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        action: "activate",
                        title: "Reactivate Leader",
                      })
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                )}
                <Button variant="outline" onClick={handleRecalculate}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t("recalculate_stats")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                {isPositiveRoi ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span>ROI</span>
              </div>
              <div
                className={`text-xl font-bold ${isPositiveRoi ? "text-green-600" : "text-red-600"}`}
              >
                {isPositiveRoi ? "+" : ""}
                {(leader.roi ?? 0).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <BarChart3 className="h-4 w-4" />
                <span>{tCommon("win_rate")}</span>
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {(leader.winRate ?? 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Users className="h-4 w-4" />
                <span>Followers</span>
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {leader.totalFollowers ?? 0} / {leader.maxFollowers}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Activity className="h-4 w-4" />
                <span>Trades</span>
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {leader.totalTrades ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span>Profit</span>
              </div>
              <div
                className={`text-xl font-bold ${(leader.totalProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                ${(leader.totalProfit ?? 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                <Activity className="h-4 w-4" />
                <span>Volume</span>
              </div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                ${(leader.totalVolume ?? 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="followers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="followers">
              {tExt("followers")}
              {leader.followers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="trades">
              {tCommon("recent_trades")}
              {leader.trades?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers">
            <Card>
              <CardContent className="p-0">
                {leader.followers && leader.followers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead>{tExt("copy_mode")}</TableHead>
                        <TableHead>Started</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leader.followers.map((follower: any) => (
                        <TableRow key={follower.id}>
                          <TableCell>
                            {follower.user?.firstName} {follower.user?.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                follower.status === "ACTIVE"
                                  ? "bg-green-100 text-green-700"
                                  : follower.status === "PAUSED"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-700"
                              }
                            >
                              {follower.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {follower.allocations?.filter(
                              (a: any) => a.isActive
                            ).length || 0}{" "}
                            markets
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              (follower.totalProfit || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${(follower.totalProfit || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>{follower.copyMode}</TableCell>
                          <TableCell className="text-sm text-zinc-500">
                            {new Date(follower.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-16 text-zinc-400">
                    {tExt("no_followers_yet")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card>
              <CardContent className="p-0">
                {leader.trades && leader.trades.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Side</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leader.trades.map((trade: any) => (
                        <TableRow key={trade.id}>
                          <TableCell className="text-sm text-zinc-500">
                            {new Date(trade.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono">
                            {trade.symbol}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                trade.side === "BUY"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {trade.side}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {trade.amount?.toFixed(6)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${trade.price?.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              (trade.profit || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {trade.profit != null
                              ? `$${trade.profit.toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{trade.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-16 text-zinc-400">
                    {t("no_trades_yet")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Dialog */}
        <Dialog
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionDialog.title}</DialogTitle>
              <DialogDescription>
                {actionDialog.action === "approve" &&
                  "This will allow the user to start accepting followers."}
                {actionDialog.action === "reject" &&
                  "This will reject the leader application. Please provide a reason."}
                {actionDialog.action === "suspend" &&
                  "This will suspend the leader and pause all their followers."}
                {actionDialog.action === "activate" &&
                  "This will reactivate the leader. Followers will remain paused."}
              </DialogDescription>
            </DialogHeader>
            {["reject", "suspend"].includes(actionDialog.action) && (
              <Textarea
                placeholder={t("enter_reason_ellipsis")}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setActionDialog({ open: false, action: "", title: "" })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={isSubmitting}
                className={
                  actionDialog.action === "reject" ||
                  actionDialog.action === "suspend"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
                }
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
