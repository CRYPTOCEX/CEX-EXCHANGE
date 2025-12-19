"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import {
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  FileText,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TradeTimelineView } from "./components/trade-timeline-view";
import { AdminChatTab } from "../../components/admin-chat-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useAdminTradesStore } from "@/store/p2p/admin-trades-store";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import { useUserStore } from "@/store/user";

// Get WebSocket URL for P2P trade
function getP2PTradeWsUrl(tradeId: string): string {
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = process.env.NEXT_PUBLIC_BACKEND_WS_URL || (typeof window !== "undefined" ? window.location.host : "");
  return `${protocol}//${host}/api/p2p/trade/${tradeId}`;
}

export default function AdminTradeDetailsClient() {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const params = useParams();
  const tradeId = params.id as string;
  const { user } = useUserStore();

  // WebSocket state
  const [wsMessages, setWsMessages] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsConnectionId = `admin-p2p-trade-${tradeId}`;

  // Use store for trade data and actions
  const {
    tradeDetails,
    isLoadingTradeDetails,
    tradeDetailsError,
    getTradeById,
    resolveTrade,
    cancelTrade,
    addAdminNote,
    isResolvingTrade,
    isCancellingTrade,
    isAddingNote,
  } = useAdminTradesStore();

  // Get trade from store
  const trade = tradeDetails[tradeId] || null;
  const loading = isLoadingTradeDetails && !trade;
  const error = tradeDetailsError;

  // Safe access helpers for buyer/seller
  const buyer = useMemo(() => ({
    id: trade?.buyer?.id || (trade as any)?.buyerId || "",
    name: trade?.buyer?.name || "Unknown Buyer",
    initials: trade?.buyer?.initials || "?",
    avatar: trade?.buyer?.avatar || null,
    email: trade?.buyer?.email || "",
  }), [trade]);

  const seller = useMemo(() => ({
    id: trade?.seller?.id || (trade as any)?.sellerId || "",
    name: trade?.seller?.name || "Unknown Seller",
    initials: trade?.seller?.initials || "?",
    avatar: trade?.seller?.avatar || null,
    email: trade?.seller?.email || "",
  }), [trade]);

  // Local UI state (appropriate for local state)
  const [activeTab, setActiveTab] = useState("overview");
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [newNote, setNewNote] = useState("");

  // Derive action in progress state from store
  const actionInProgress = isResolvingTrade || isCancellingTrade || isAddingNote;

  // Fetch trade details on mount
  useEffect(() => {
    if (tradeId) {
      getTradeById(tradeId).then((data) => {
        if (!data) {
          router.push("/admin/p2p/trade?error=trade-not-found");
        }
      });
    }
  }, [tradeId, getTradeById, router]);

  // Handle WebSocket messages for trade updates
  const handleTradeData = useCallback((data: any) => {
    // Initial data from WebSocket subscription
    if (data.messages) {
      setWsMessages(data.messages.map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        sender: msg.senderName || "Unknown",
        content: msg.message,
        timestamp: msg.createdAt,
        isAdmin: msg.isAdminMessage || false,
      })));
    }
  }, []);

  // Handle WebSocket events (status changes, new messages)
  const handleTradeEvent = useCallback((data: any) => {
    if (data.type === "MESSAGE") {
      // Add new message to chat
      const newMsg = {
        id: data.data.id,
        senderId: data.data.senderId,
        sender: data.data.senderName || "Unknown",
        content: data.data.message,
        timestamp: data.data.createdAt,
        isAdmin: data.data.isAdminMessage || false,
      };
      setWsMessages((prev) => {
        // Check if message already exists
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });
    } else if (data.type === "STATUS_CHANGE" || data.type === "TRADE_UPDATE") {
      // Refetch trade data on status change
      getTradeById(tradeId);
    }
  }, [tradeId, getTradeById]);

  // Handle WebSocket connection status
  const handleWsStatus = useCallback((status: ConnectionStatus) => {
    setWsConnected(status === ConnectionStatus.CONNECTED);
  }, []);

  // Set up WebSocket connection
  useEffect(() => {
    if (!user?.id || !tradeId) return;

    const wsUrl = getP2PTradeWsUrl(tradeId);

    // Connect to WebSocket
    wsManager.connect(wsUrl, wsConnectionId);

    // Subscribe to trade data stream
    wsManager.subscribe("p2p-trade-data", handleTradeData, wsConnectionId);
    wsManager.subscribe("p2p-trade-event", handleTradeEvent, wsConnectionId);
    wsManager.addStatusListener(handleWsStatus, wsConnectionId);

    // Send subscription message once connected
    const subscribeInterval = setInterval(() => {
      if (wsManager.getStatus(wsConnectionId) === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage(
          {
            action: "SUBSCRIBE",
            payload: { tradeId, userId: user.id, isAdmin: true },
          },
          wsConnectionId
        );
        clearInterval(subscribeInterval);
      }
    }, 100);

    return () => {
      clearInterval(subscribeInterval);
      // Unsubscribe and close connection
      wsManager.sendMessage(
        {
          action: "UNSUBSCRIBE",
          payload: { tradeId },
        },
        wsConnectionId
      );
      wsManager.unsubscribe("p2p-trade-data", handleTradeData, wsConnectionId);
      wsManager.unsubscribe("p2p-trade-event", handleTradeEvent, wsConnectionId);
      wsManager.removeStatusListener(handleWsStatus, wsConnectionId);
      wsManager.close(wsConnectionId);
    };
  }, [tradeId, user?.id, wsConnectionId, handleTradeData, handleTradeEvent, handleWsStatus]);

  const handleAction = (action: string) => {
    setActionType(action);
    setIsConfirmingAction(true);
    setActionMessage(null);
  };

  const handleSendMessage = async () => {
    if (!adminMessage.trim()) {
      setActionMessage({
        type: "error",
        message: "Please enter a message",
      });
      return;
    }

    // Use store action with isMessage flag to add as chat message
    await addAdminNote(tradeId, adminMessage, true);

    if (!useAdminTradesStore.getState().addingNoteError) {
      setActionMessage({
        type: "success",
        message: "Message sent successfully",
      });
      setAdminMessage("");
      // Refresh trade data from store
      getTradeById(tradeId);
    } else {
      setActionMessage({
        type: "error",
        message: useAdminTradesStore.getState().addingNoteError || "Failed to send message",
      });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setActionMessage({
        type: "error",
        message: "Please enter a note",
      });
      return;
    }

    // Use store action
    await addAdminNote(tradeId, newNote);

    if (!useAdminTradesStore.getState().addingNoteError) {
      setActionMessage({
        type: "success",
        message: "Note added successfully",
      });
      setNewNote("");
      // Refresh trade data from store
      getTradeById(tradeId);
    } else {
      setActionMessage({
        type: "error",
        message: useAdminTradesStore.getState().addingNoteError || "Failed to add note",
      });
    }
  };

  const confirmAction = async () => {
    try {
      // Use store actions based on action type
      switch (actionType) {
        case "cancel":
          await cancelTrade(tradeId, "Trade cancelled by admin");
          if (useAdminTradesStore.getState().cancellingTradeError) {
            throw new Error(useAdminTradesStore.getState().cancellingTradeError || "Failed to cancel trade");
          }
          break;
        case "resolve-buyer":
          await resolveTrade(
            tradeId,
            "BUYER_WINS",
            "Resolved by admin in favor of buyer"
          );
          if (useAdminTradesStore.getState().resolvingTradeError) {
            throw new Error(useAdminTradesStore.getState().resolvingTradeError || "Failed to resolve trade");
          }
          break;
        case "resolve-seller":
          await resolveTrade(
            tradeId,
            "SELLER_WINS",
            "Resolved by admin in favor of seller"
          );
          if (useAdminTradesStore.getState().resolvingTradeError) {
            throw new Error(useAdminTradesStore.getState().resolvingTradeError || "Failed to resolve trade");
          }
          break;
        case "flag":
          await addAdminNote(tradeId, "[FLAG] Trade flagged for review");
          if (useAdminTradesStore.getState().addingNoteError) {
            throw new Error(useAdminTradesStore.getState().addingNoteError || "Failed to flag trade");
          }
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }

      // Refresh trade data from store
      await getTradeById(tradeId);

      setActionMessage({
        type: "success",
        message: `Action ${actionType} completed successfully.`,
      });

      // If the action was to cancel the trade, redirect back to the trades list after a delay
      if (actionType === "cancel") {
        setTimeout(() => {
          router.push("/admin/p2p/trade?success=trade-cancelled");
        }, 2000);
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to perform action",
      });
    } finally {
      setIsConfirmingAction(false);
      setActionType(null);
    }
  };

  const cancelAction = () => {
    setIsConfirmingAction(false);
    setActionType(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tExt("back_to_trades")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[250px]" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[120px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/p2p/trade")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tExt("back_to_trades")}
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!trade) {
    return null;
  }

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Breadcrumb and back button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            {tCommon("admin")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/admin/p2p/trade" className="hover:text-foreground">
            {tCommon("p2p_trades")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{trade.id}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/p2p/trade")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tExt("back_to_trades")}
        </Button>
      </div>

      {/* Trade header with participants */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Buyer */}
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-14 w-14 ring-2 ring-green-500/30">
                <AvatarImage
                  src={buyer.avatar || "/img/placeholder.svg"}
                  alt={buyer.name}
                />
                <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  {buyer.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{tExt("buyer")}</p>
                <p className="font-semibold">{buyer.name}</p>
                {buyer.id && (
                  <Link
                    href={`/admin/crm/user/${buyer.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {tExt("view_profile")}
                  </Link>
                )}
              </div>
            </div>

            {/* Trade info center */}
            <div className="flex flex-col items-center gap-2 px-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant={trade.type === "BUY" ? "default" : "secondary"}
                  className={trade.type === "BUY"
                    ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800"
                    : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800"
                  }
                >
                  {trade.type === "BUY" ? "Buying" : "Selling"}
                </Badge>
                <TradeStatusBadge status={trade.status} />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{trade.amount} {trade.crypto}</p>
                <p className="text-sm text-muted-foreground">{trade.fiatValue}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{trade.createdAt ? new Date(trade.createdAt).toLocaleString() : trade.date}</span>
              </div>
            </div>

            {/* Seller */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{tCommon("seller")}</p>
                <p className="font-semibold">{seller.name}</p>
                {seller.id && (
                  <Link
                    href={`/admin/crm/user/${seller.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {tExt("view_profile")}
                  </Link>
                )}
              </div>
              <Avatar className="h-14 w-14 ring-2 ring-orange-500/30">
                <AvatarImage
                  src={seller.avatar || "/img/placeholder.svg"}
                  alt={seller.name}
                />
                <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                  {seller.initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action message */}
      {actionMessage && (
        <Alert
          variant={actionMessage.type === "success" ? "default" : "destructive"}
        >
          <AlertTitle>
            {actionMessage.type === "success" ? "Success" : "Error"}
          </AlertTitle>
          <AlertDescription>{actionMessage.message}</AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
              <TabsTrigger value="timeline">{tCommon("timeline")}</TabsTrigger>
              <TabsTrigger value="chat">{tCommon("chat")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("trade_information")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Cryptocurrency */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{trade.crypto?.slice(0, 2) || "?"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tExt("cryptocurrency")}</p>
                        <p className="font-semibold truncate">{trade.crypto || "N/A"}</p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <span className="text-green-600 dark:text-green-400 font-bold text-lg">#</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tCommon("amount")}</p>
                        <p className="font-semibold truncate">{trade.amount || "N/A"}</p>
                      </div>
                    </div>

                    {/* Fiat Value */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">$</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tCommon("fiat_value")}</p>
                        <p className="font-semibold truncate">{trade.fiatValue || "N/A"}</p>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tCommon("payment_method")}</p>
                        <p className="font-semibold truncate text-sm">{trade.paymentMethodDetails?.name || "N/A"}</p>
                      </div>
                    </div>

                    {/* Escrow Fee */}
                    <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                      <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-lg">%</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tExt("escrow_fee")}</p>
                        <p className="font-semibold truncate">{trade.escrowFee || "0"} {trade.crypto}</p>
                      </div>
                    </div>

                    {/* Time Remaining */}
                    {trade.timeRemaining && (
                      <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{tExt("time_remaining")}</p>
                          <p className="font-semibold text-red-600 dark:text-red-400">{trade.timeRemaining}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tExt("trade_timeline")}</CardTitle>
                  <CardDescription>
                    {tCommon("chronological_events_for_this_trade")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TradeTimelineView timeline={trade.timeline || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <AdminChatTab
                messages={wsMessages.length > 0 ? wsMessages : (trade.messages || [])}
                buyerId={buyer.id}
                sellerId={seller.id}
                messageText={adminMessage}
                setMessageText={setAdminMessage}
                handleSendMessage={handleSendMessage}
                isSendingMessage={actionInProgress}
                isConnected={wsConnected}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{tCommon("admin_actions")}</CardTitle>
              <CardDescription>{tCommon("manage_this_trade")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trade.status === "DISPUTED" && (trade.disputeId || trade.dispute?.id) && (
                  <Link href={`/admin/p2p/dispute/${trade.disputeId || trade.dispute?.id}`} className="block">
                    <Button
                      variant="default"
                      className="w-full justify-start bg-red-600 hover:bg-red-700"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {tCommon("view_dispute_details")}
                    </Button>
                  </Link>
                )}
                {["PENDING", "PAYMENT_SENT"].includes(trade.status) && (
                  <Button
                    onClick={() => handleAction("flag")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                    {tCommon("flag_for_review")}
                  </Button>
                )}
                {trade.status !== "COMPLETED" &&
                  trade.status !== "CANCELLED" && (
                    <Button
                      onClick={() => handleAction("cancel")}
                      variant="destructive"
                      className="w-full justify-start"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {tExt("cancel_trade")}
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {tCommon("trade_notes")}
              </CardTitle>
              <CardDescription>{tCommon("internal_admin_notes")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Display admin notes from timeline */}
                {trade.timeline && trade.timeline.filter((e: any) =>
                  e.event === "Admin Note" ||
                  e.type === "Admin Note" ||
                  (e.event && e.event.toLowerCase().includes("note"))
                ).length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2 bg-muted/30">
                    {trade.timeline
                      .filter((e: any) =>
                        e.event === "Admin Note" ||
                        e.type === "Admin Note" ||
                        (e.event && e.event.toLowerCase().includes("note"))
                      )
                      .reverse()
                      .map((note: any, index: number) => (
                        <div key={index} className="rounded-md bg-background border p-3">
                          <p className="text-sm whitespace-pre-wrap">{note.details || note.message}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            <span>{note.adminName || tCommon("admin")}</span>
                            <span>-</span>
                            <span>{new Date(note.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-md bg-muted/30">
                    {tCommon("no_notes_yet")}
                  </div>
                )}

                {/* Add new note form */}
                <div className="space-y-2 pt-2 border-t">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    rows={3}
                    placeholder={tCommon("add_a_note_about_this_trade_ellipsis")}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    disabled={actionInProgress}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleAddNote}
                    disabled={actionInProgress || !newNote.trim()}
                  >
                    {actionInProgress ? tCommon("adding") : tCommon("add_note")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmingAction} onOpenChange={(open) => !open && cancelAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {tCommon("confirm_action")}
            </DialogTitle>
            <DialogDescription>
              {actionType === "flag" &&
                tCommon("are_you_sure_you_want_to_flag_this_trade")}
              {actionType === "cancel" &&
                tCommon("are_you_sure_you_want_to_cancel_this_trade")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelAction}
              disabled={actionInProgress}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant={actionType === "cancel" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={actionInProgress}
            >
              {actionInProgress ? tCommon("processing") : tCommon("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeStatusBadge({ status }: { status: string }) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  switch (status) {
    case "COMPLETED":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800"
        >
          {tCommon("completed")}
        </Badge>
      );
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800"
        >
          {tCommon("pending")}
        </Badge>
      );
    case "PAYMENT_SENT":
      return (
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-100 text-orange-800"
        >
          {tCommon("payment_sent")}
        </Badge>
      );
    case "DISPUTED":
      return <Badge variant="destructive">{t("disputed")}</Badge>;
    case "CANCELLED":
      return (
        <Badge
          variant="outline"
          className="border-gray-200 bg-gray-100 text-gray-800"
        >
          {tCommon("cancelled")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
