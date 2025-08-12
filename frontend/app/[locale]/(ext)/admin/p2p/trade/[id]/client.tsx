"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Clock,
  ChevronRight,
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TradeTimelineView } from "./components/trade-timeline-view";
import { TradeMessagesView } from "./components/trade-messages-view";
import { TradeDisputeView } from "./components/trade-dispute-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function AdminTradeDetailsClient() {
  const t = useTranslations("ext");
  const router = useRouter();
  const params = useParams();
  const tradeId = params.id as string;

  const [trade, setTrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchTradeDetails = async () => {
      try {
        setLoading(true);
        // In a real app, this would be an API call
        const response = await fetch(`/api/admin/trades/${tradeId}`);

        if (!response.ok) {
          if (response.status === 404) {
            router.push("/admin/trades?error=trade-not-found");
            return;
          }
          throw new Error(`Failed to fetch trade: ${response.statusText}`);
        }

        const data = await response.json();
        setTrade(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load trade details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (tradeId) {
      fetchTradeDetails();
    }
  }, [tradeId, router]);

  const handleAction = (action: string) => {
    setActionType(action);
    setIsConfirmingAction(true);
    setActionMessage(null);
  };

  const confirmAction = async () => {
    try {
      setActionInProgress(true);

      // In a real app, this would be an API call
      const response = await fetch(`/api/admin/trades/${tradeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: actionType,
          notes:
            actionType === "message"
              ? "Admin message: Please provide additional information."
              : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to perform action: ${response.statusText}`);
      }

      const updatedTrade = await response.json();
      setTrade(updatedTrade);
      setActionMessage({
        type: "success",
        message: `Action ${actionType} completed successfully.`,
      });

      // If the action was to cancel the trade, redirect back to the trades list after a delay
      if (actionType === "cancel") {
        setTimeout(() => {
          router.push("/admin/trades?success=trade-cancelled");
        }, 2000);
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to perform action",
      });
    } finally {
      setActionInProgress(false);
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
            {t("back_to_trades")}
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
          onClick={() => router.push("/admin/trades")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_to_trades")}
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
    <div className="space-y-6">
      {/* Breadcrumb and back button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            {t("Admin")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/admin/trades" className="hover:text-foreground">
            {t("Trades")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{trade.id}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/trades")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_to_trades")}
        </Button>
      </div>

      {/* Trade header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("Trade")}
            {trade.id}
            <Badge
              variant={trade.type === "BUY" ? "outline" : "secondary"}
              className="ml-2"
            >
              {trade.type}
            </Badge>
            <TradeStatusBadge status={trade.status} />
          </h1>
          <p className="text-muted-foreground">
            {t("created")}
            {trade.date}
          </p>
        </div>
      </div>

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="timeline">{t("Timeline")}</TabsTrigger>
              <TabsTrigger value="messages">{t("Messages")}</TabsTrigger>
              {trade.status === "DISPUTED" && (
                <TabsTrigger value="dispute">{t("Dispute")}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("trade_information")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        {t("Cryptocurrency")}
                      </dt>
                      <dd className="text-lg">{trade.crypto}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        {t("Amount")}
                      </dt>
                      <dd className="text-lg">{trade.amount}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        {t("fiat_value")}
                      </dt>
                      <dd className="text-lg">{trade.fiatValue}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        {t("payment_method")}
                      </dt>
                      <dd className="text-lg">{trade.paymentMethod}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        {t("escrow_fee")}
                      </dt>
                      <dd className="text-lg">{trade.escrowFee}</dd>
                    </div>
                    {trade.timeRemaining && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">
                          {t("time_remaining")}
                        </dt>
                        <dd className="flex items-center text-lg">
                          <Clock className="mr-1 h-4 w-4 text-orange-500" />
                          {trade.timeRemaining}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("Participants")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        {t("Buyer")}
                      </h3>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={trade.buyer.avatar || "/placeholder.svg"}
                            alt={trade.buyer.name}
                          />
                          <AvatarFallback>
                            {trade.buyer.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{trade.buyer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("user_id_buy123456")}
                          </p>
                          <Link
                            href={`/admin/users/${trade.buyer.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {t("view_profile")}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        {t("Seller")}
                      </h3>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={trade.seller.avatar || "/placeholder.svg"}
                            alt={trade.seller.name}
                          />
                          <AvatarFallback>
                            {trade.seller.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{trade.seller.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("user_id_sell789012")}
                          </p>
                          <Link
                            href={`/admin/users/${trade.seller.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {t("view_profile")}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("trade_timeline")}</CardTitle>
                  <CardDescription>
                    {t("chronological_events_for_this_trade")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TradeTimelineView timeline={trade.timeline || []} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("trade_messages")}</CardTitle>
                  <CardDescription>
                    {t("communication_between_participants")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TradeMessagesView messages={trade.messages || []} />

                  {/* Admin message form */}
                  <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-medium">
                      {t("send_admin_message")}
                    </h3>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      rows={3}
                      placeholder="Type your message to both participants..."
                    />
                    <Button size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {t("send_message")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {trade.status === "DISPUTED" && (
              <TabsContent value="dispute" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("dispute_details")}</CardTitle>
                    <CardDescription>
                      {t("information_about_the_dispute")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TradeDisputeView
                      reason={trade.disputeReason || "Payment not received"}
                      details={
                        trade.disputeDetails ||
                        "Buyer claims payment was sent but seller hasn't received it."
                      }
                      trade={trade}
                    />

                    {/* Evidence section */}
                    <div className="mt-6">
                      <h3 className="mb-2 font-medium">
                        {t("evidence_submitted")}
                      </h3>
                      <div className="space-y-4">
                        <div className="rounded-md border border-border p-4">
                          <p className="mb-1 text-sm font-medium">
                            {t("payment_receipt_(buyer)")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("bank_transfer_receipt_1130_am")}
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            {t("view_document")}
                          </Button>
                        </div>
                        <div className="rounded-md border border-border p-4">
                          <p className="mb-1 text-sm font-medium">
                            {t("bank_statement_(seller)")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("account_statement_uploaded_1215_pm")}
                          </p>
                          <Button variant="outline" size="sm" className="mt-2">
                            {t("view_document")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin_actions")}</CardTitle>
              <CardDescription>{t("manage_this_trade")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trade.status === "DISPUTED" && (
                  <>
                    <Button
                      onClick={() => handleAction("resolve-buyer")}
                      className="w-full justify-start"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t("resolve_for_buyer")}
                    </Button>
                    <Button
                      onClick={() => handleAction("resolve-seller")}
                      className="w-full justify-start"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t("resolve_for_seller")}
                    </Button>
                  </>
                )}
                {["PENDING", "PAYMENT_SENT"].includes(trade.status) && (
                  <Button
                    onClick={() => handleAction("flag")}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                    {t("flag_for_review")}
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
                      {t("cancel_trade")}
                    </Button>
                  )}
                <Button
                  onClick={() => handleAction("message")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t("message_participants")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("trade_notes")}</CardTitle>
              <CardDescription>{t("internal_admin_notes")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">
                    {t("user_has_been_past_month")}. {t("proceed_with_caution")}
                    .
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("added_by_admin_on_jul_10_2023")}
                  </p>
                </div>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  rows={3}
                  placeholder="Add a note about this trade..."
                />
                <Button size="sm" className="w-full">
                  {t("add_note")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("related_trades")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t("T-12340")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("jul_5_2023")}
                      </p>
                    </div>
                    <Badge variant="outline">{t("Completed")}</Badge>
                  </div>
                </div>
                <div className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">T-12339</p>
                      <p className="text-xs text-muted-foreground">
                        {t("jun_28_2023")}
                      </p>
                    </div>
                    <Badge variant="outline">{t("Completed")}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  {t("view_all_related_trades")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation dialog */}
      {isConfirmingAction && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">
              {t("confirm_action")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              {actionType === "resolve-buyer" &&
                "Are you sure you want to resolve this dispute in favor of the buyer? This will release the funds to the buyer."}
              {actionType === "resolve-seller" &&
                "Are you sure you want to resolve this dispute in favor of the seller? This will release the funds to the seller."}
              {actionType === "flag" &&
                "Are you sure you want to flag this trade for further review? This will mark the trade for special attention."}
              {actionType === "cancel" &&
                "Are you sure you want to cancel this trade? This will return any escrowed funds and cannot be undone."}
              {actionType === "message" &&
                "Send a message to both participants? They will be notified immediately."}
            </p>
            <div className="flex gap-2">
              <Button onClick={confirmAction} disabled={actionInProgress}>
                {actionInProgress ? "Processing..." : "Confirm"}
              </Button>
              <Button
                onClick={cancelAction}
                variant="outline"
                disabled={actionInProgress}
              >
                {t("Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TradeStatusBadge({ status }: { status: string }) {
  const t = useTranslations("ext");
  switch (status) {
    case "COMPLETED":
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-100 text-green-800"
        >
          {t("Completed")}
        </Badge>
      );
    case "PENDING":
      return (
        <Badge
          variant="outline"
          className="border-blue-200 bg-blue-100 text-blue-800"
        >
          {t("Pending")}
        </Badge>
      );
    case "PAYMENT_SENT":
      return (
        <Badge
          variant="outline"
          className="border-orange-200 bg-orange-100 text-orange-800"
        >
          {t("payment_sent")}
        </Badge>
      );
    case "DISPUTED":
      return <Badge variant="destructive">{t("Disputed")}</Badge>;
    case "CANCELLED":
      return (
        <Badge
          variant="outline"
          className="border-gray-200 bg-gray-100 text-gray-800"
        >
          {t("Cancelled")}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
