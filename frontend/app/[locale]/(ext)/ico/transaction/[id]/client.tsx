"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function TransactionDetailsClient() {
  const t = useTranslations("ext");
  const { id } = useParams() as { id: string };
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      const { data, error } = await $fetch({
        url: `/api/ico/transaction/${id}`,
        silent: true,
      });

      if (!error) {
        setTransaction(data);
      }
      setLoading(false);
    };

    fetchTransaction();
  }, [id]);

  if (loading || !transaction) {
    return null; // Loading state is handled by the loading.tsx file
  }

  // Compute tokenAmount if not provided in the response
  const tokenAmount =
    transaction.tokenAmount ||
    (transaction.price > 0 ? transaction.amount / transaction.price : 0);

  // Normalize status: RELEASED maps to "completed", VERIFICATION to "pending", etc.
  const normalizedStatus = (() => {
    switch (transaction.status) {
      case "RELEASED":
        return "completed";
      case "VERIFICATION":
        return "pending";
      case "REJECTED":
        return "failed";
      case "PENDING":
      default:
        return "pending";
    }
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP 'at' p");
    } catch (e) {
      return dateString;
    }
  };

  const handleShareTransaction = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Transaction link copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/ico/dashboard?tab=transactions"
            className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("back_to_dashboard")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("transaction_details")}
          </h1>
          <p className="text-muted-foreground">
            {t("view_details_for_transaction_#")}
            {transaction.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShareTransaction}>
            <Share2 className="w-4 h-4 mr-2" />
            {t("Share")}
          </Button>
        </div>
      </div>

      {/* Transaction Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("transaction_overview")}</CardTitle>
            <Badge className={getStatusColor(normalizedStatus)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(normalizedStatus)}
                {normalizedStatus.charAt(0).toUpperCase() +
                  normalizedStatus.slice(1)}
              </span>
            </Badge>
          </div>
          <CardDescription>
            {t("transaction_processed_on")}
            {formatDate(transaction.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("transaction_type")}
                </h3>
                <p className="text-base font-medium capitalize">
                  {transaction.type}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("Amount")}
                </h3>
                <p className="text-base font-medium">
                  / $
                  {transaction.amount.toLocaleString()}
                </p>
              </div>

              {tokenAmount > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t("token_amount")}
                  </h3>
                  <p className="text-base font-medium">
                    {tokenAmount.toLocaleString()}{" "}
                    {transaction.offering?.symbol}
                  </p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {transaction.offering && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t("Token")}
                  </h3>
                  <p className="text-base font-medium">
                    {transaction.offering.name}
                    (
                    {transaction.offering.symbol}
                    )
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t("Date")}
                </h3>
                <p className="text-base font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                  {formatDate(transaction.createdAt)}
                </p>
              </div>

              {transaction.releaseUrl && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t("transaction_release_url")}
                  </h3>
                  <p className="text-base font-medium flex items-center">
                    <code className="text-xs bg-muted p-1 rounded">
                      {transaction.releaseUrl.substring(0, 40)}
                    </code>
                    <Link
                      href={transaction.releaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="sr-only">View on Etherscan</span>
                      </Button>
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Transaction Timeline */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t("transaction_timeline")}</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div className="rounded-full h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="h-full w-0.5 bg-border mt-1"></div>
                </div>
                <div>
                  <p className="font-medium">{t("transaction_initiated")}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`rounded-full h-8 w-8 flex items-center justify-center ${
                      normalizedStatus === "completed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {normalizedStatus === "completed" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  {normalizedStatus === "completed" && (
                    <div className="h-full w-0.5 bg-border mt-1"></div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{t("Processing")}</p>
                  <p className="text-sm text-muted-foreground">
                    {normalizedStatus === "pending"
                      ? "Transaction is being processed"
                      : "Transaction processed successfully"}
                  </p>
                </div>
              </div>

              {normalizedStatus === "completed" && (
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="rounded-full h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{t("Completed")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("transaction_completed_successfully")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 items-start">
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">{t("Details")}</TabsTrigger>
              <TabsTrigger value="notes">{t("Notes")}</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <h3 className="font-medium mb-2">{t("transaction_details")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {t("transaction_id")}
                    </p>
                    <p className="font-medium">{transaction.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t("payment_method")}
                    </p>
                    <p className="font-medium">{t("credit_card")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("Fee")}</p>
                    <p className="font-medium">
                      $0. 00
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("Total")}</p>
                    <p className="font-medium">
                      / $
                      {transaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="notes" className="pt-4">
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  {transaction.notes ||
                    "No notes available for this transaction."}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardFooter>
      </Card>

      {transaction.offering && (
        <Card>
          <CardHeader>
            <CardTitle>{t("related_token")}</CardTitle>
            <CardDescription>
              {t("details_about_the_this_transaction")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{transaction.offering.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {transaction.offering.symbol}
                  </p>
                </div>
              </div>
              <Link href={`/ico/offer/${transaction.offering.id}`}>
                <Button variant="outline">{t("view_token")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
