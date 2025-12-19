"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TradeDetails } from "./trade-details";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useTranslations } from "next-intl";
import { useNotificationsStore } from "@/store/notification-store";
import { wsManager } from "@/services/ws-manager";
import { useUserStore } from "@/store/user";

interface TradeDetailsWrapperProps {
  tradeId: string;
}

// Get WebSocket URL for P2P trade
function getP2PTradeWsUrl(tradeId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = process.env.NEXT_PUBLIC_BACKEND_WS_URL || window.location.host;
  return `${protocol}//${host}/api/p2p/trade/${tradeId}`;
}

export function TradeDetailsWrapper({ tradeId }: TradeDetailsWrapperProps) {
  const t = useTranslations("ext_p2p");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTrade, isLoadingTradeById, tradeByIdError, fetchTradeById } =
    useP2PStore();
  const { fetchNotifications } = useNotificationsStore();
  const { user } = useUserStore();
  const [messages, setMessages] = useState<any[]>([]);
  const wsConnectionId = `p2p-trade-${tradeId}`;

  // Get initial tab from URL query param or default to "details"
  const tabParam = searchParams.get("tab");
  const validTabs = ["details", "chat", "payment", "escrow"];
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : "details";
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Handle tab change and update URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  // Scroll to tabs section when coming from chat button
  useEffect(() => {
    if (tabParam === "chat" && tabsRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [tabParam]);

  // Load trade details initially
  useEffect(() => {
    fetchTradeById(tradeId);
  }, [tradeId, fetchTradeById]);

  // Handle WebSocket messages for trade updates
  const handleTradeData = useCallback((data: any) => {
    // Initial data from WebSocket subscription
    if (data.messages) {
      setMessages(data.messages.map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.message,
        timestamp: msg.createdAt,
        isSystem: false,
        isAdminMessage: msg.isAdminMessage || false,
      })));
    }

    // Update trade data in store
    if (data.id) {
      useP2PStore.setState((state) => {
        // Don't overwrite with stale status - check timestamps
        const currentUpdatedAt = state.currentTrade?.updatedAt ? new Date(state.currentTrade.updatedAt).getTime() : 0;
        const newUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

        // If current trade data is newer, preserve the status
        const shouldPreserveStatus = currentUpdatedAt > newUpdatedAt;

        // Parse paymentDetails if it's a string
        let paymentDetails = data.paymentDetails;
        if (typeof paymentDetails === 'string') {
          try {
            paymentDetails = JSON.parse(paymentDetails);
          } catch {
            paymentDetails = state.currentTrade?.paymentDetails;
          }
        }

        return {
          currentTrade: {
            ...state.currentTrade,
            ...data,
            // Use parsed paymentDetails or preserve existing
            paymentDetails: paymentDetails || state.currentTrade?.paymentDetails,
            // Preserve status if current data is newer (prevents stale WebSocket data)
            status: shouldPreserveStatus ? state.currentTrade?.status : data.status,
            // Preserve frontend-transformed fields
            type: state.currentTrade?.type,
            coin: state.currentTrade?.coin,
            counterparty: state.currentTrade?.counterparty,
          },
        };
      });
    }
  }, []);

  // Handle WebSocket events (status changes, new messages)
  const handleTradeEvent = useCallback((data: any) => {
    if (data.type === "MESSAGE") {
      // Add new message to chat
      const newMsg = {
        id: data.data.id,
        senderId: data.data.senderId,
        senderName: data.data.senderName,
        content: data.data.message,
        timestamp: data.data.createdAt,
        isSystem: false,
        isAdminMessage: data.data.isAdminMessage || false,
      };
      setMessages((prev) => {
        // Check if message already exists
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg];
      });
    } else if (data.type === "STATUS_CHANGE" || data.type === "DISPUTE") {
      // Update trade state directly from WebSocket event data for instant UI update
      useP2PStore.setState((state) => ({
        currentTrade: state.currentTrade ? {
          ...state.currentTrade,
          status: data.data.status,
          timeline: data.data.timeline || state.currentTrade.timeline,
          paymentConfirmedAt: data.data.paymentConfirmedAt || state.currentTrade.paymentConfirmedAt,
          completedAt: data.data.completedAt || state.currentTrade.completedAt,
          cancelledAt: data.data.cancelledAt || state.currentTrade.cancelledAt,
          dispute: data.data.dispute || state.currentTrade.dispute,
        } : null,
      }));
      // Also refetch to ensure we have all the latest data
      fetchTradeById(tradeId);
      fetchNotifications();
    } else if (data.type === "TRADE_UPDATE") {
      // Update trade data
      useP2PStore.setState((state) => {
        // Parse paymentDetails if it's a string
        let paymentDetails = data.data?.paymentDetails;
        if (typeof paymentDetails === 'string') {
          try {
            paymentDetails = JSON.parse(paymentDetails);
          } catch {
            paymentDetails = state.currentTrade?.paymentDetails;
          }
        }
        return {
          currentTrade: {
            ...state.currentTrade,
            ...data.data,
            // Use parsed paymentDetails or preserve existing
            paymentDetails: paymentDetails || state.currentTrade?.paymentDetails,
          },
        };
      });
    }
  }, [tradeId, fetchTradeById, fetchNotifications]);

  // Set up WebSocket connection
  useEffect(() => {
    if (!user?.id || !tradeId) return;

    const wsUrl = getP2PTradeWsUrl(tradeId);

    // Connect to WebSocket
    wsManager.connect(wsUrl, wsConnectionId);

    // Subscribe to trade data stream
    wsManager.subscribe("p2p-trade-data", handleTradeData, wsConnectionId);
    wsManager.subscribe("p2p-trade-event", handleTradeEvent, wsConnectionId);

    // Send subscription message once connected
    const subscribeInterval = setInterval(() => {
      if (wsManager.getStatus(wsConnectionId) === "connected") {
        wsManager.sendMessage(
          {
            action: "SUBSCRIBE",
            payload: { tradeId, userId: user.id },
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
      wsManager.close(wsConnectionId);
    };
  }, [tradeId, user?.id, wsConnectionId, handleTradeData, handleTradeEvent]);

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
      setActiveTab={handleTabChange}
      tabsRef={tabsRef}
      messages={messages}
      setMessages={setMessages}
    />
  );
}
