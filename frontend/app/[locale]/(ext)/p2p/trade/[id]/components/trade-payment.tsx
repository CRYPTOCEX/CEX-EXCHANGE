"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  FileText,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface TradePaymentProps {
  trade: any;
  onConfirmPayment: () => Promise<void>;
}

export function TradePayment({ trade, onConfirmPayment }: TradePaymentProps) {
  const t = useTranslations("ext");
  const [reference, setReference] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const canConfirmPayment =
    trade.status === "waiting_payment" && trade.type === "buy";

  const copyPaymentDetails = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast({
      title: "Copied to clipboard",
      description: "Payment details have been copied to your clipboard.",
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast({
        title: "Reference required",
        description: "Please provide a payment reference number.",
        variant: "destructive",
      });
      return;
    }

    await onConfirmPayment();
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{t("payment_details")}</CardTitle>
          {trade.status === "waiting_payment" && (
            <Badge
              variant="outline"
              className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
            >
              <Clock className="h-3 w-3 mr-1" />
              {t("payment_required")}
            </Badge>
          )}
          {trade.status === "payment_confirmed" && (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t("payment_confirmed")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {trade.type === "buy"
            ? "Send payment to the seller using these details"
            : "Buyer will send payment using these details"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {trade.status === "waiting_payment" ? (
          <>
            <div className="rounded-md border p-4 bg-muted/30">
              <h3 className="font-medium mb-4 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                {t("payment_instructions")}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("payment_method")}
                    </p>
                    <p className="font-medium">{trade.paymentMethod}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(trade.paymentMethod, "method")
                    }
                    className="h-8 w-8"
                  >
                    {copied === "method" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("account_name")}
                    </p>
                    <p className="font-medium">
                      {trade.paymentDetails?.accountName || "John Doe"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(
                        trade.paymentDetails?.accountName || "John Doe",
                        "name"
                      )
                    }
                    className="h-8 w-8"
                  >
                    {copied === "name" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("account_number")}
                    </p>
                    <p className="font-medium">
                      {trade.paymentDetails?.accountNumber || "1234567890"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(
                        trade.paymentDetails?.accountNumber || "1234567890",
                        "number"
                      )
                    }
                    className="h-8 w-8"
                  >
                    {copied === "number" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("amount_to_send")}
                    </p>
                    <p className="font-medium">
                      / $
                      {trade.total.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(
                        `$${trade.total.toLocaleString()}`,
                        "amount"
                      )
                    }
                    className="h-8 w-8"
                  >
                    {copied === "amount" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Reference")}
                    </p>
                    <p className="font-medium">
                      {t("TRADE-")}
                      {trade.id}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(`TRADE-${trade.id}`, "reference")
                    }
                    className="h-8 w-8"
                  >
                    {copied === "reference" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("Important")}</AlertTitle>
              <AlertDescription>
                {t("always_include_the_your_payment")}.{" "}
                {t("this_helps_the_prevents_delays")}.
              </AlertDescription>
            </Alert>

            {canConfirmPayment && (
              <form onSubmit={handleSubmitProof} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="reference">
                    {t("payment_reference_transaction_id")}
                  </Label>
                  <Input
                    id="reference"
                    placeholder="Enter the reference or transaction ID"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof-note">
                    {t("additional_notes_(optional)")}
                  </Label>
                  <Textarea
                    id="proof-note"
                    placeholder="Add any additional information about your payment"
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    {t("upload_receipt")}
                  </Button>
                  <Button type="submit" className="flex-1">
                    <Upload className="mr-2 h-4 w-4" />
                    {t("confirm_payment_sent")}
                  </Button>
                </div>
              </form>
            )}
          </>
        ) : trade.status === "payment_confirmed" ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium">{t("payment_confirmed")}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {trade.type === "buy"
                ? "You have confirmed that payment has been sent. Waiting for the seller to verify and release the funds."
                : "The buyer has confirmed payment. Please verify you've received the funds before releasing escrow."}
            </p>

            <div className="mt-6 border rounded-md p-4 text-left">
              <h4 className="font-medium mb-2">{t("payment_details")}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("reference_transaction_id")}
                  </span>
                  <span>{trade.paymentReference || "TX123456789"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("payment_method")}
                  </span>
                  <span>{trade.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("amount")}</span>
                  <span>
                    / $
                    {trade.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("confirmed_at")}
                  </span>
                  <span>
                    {new Date(
                      trade.paymentConfirmedAt || Date.now()
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="font-medium">
              {t("Payment")}{" "}
              {trade.status === "completed" ? "Completed" : "Not Required"}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {trade.status === "completed"
                ? "Payment has been confirmed and the trade has been completed successfully."
                : trade.status === "disputed"
                  ? "This trade is under dispute. Payment verification is on hold."
                  : "No payment is required at this stage of the trade."}
            </p>
          </div>
        )}
      </CardContent>
      {trade.status === "payment_confirmed" && trade.type === "sell" && (
        <CardFooter>
          <Button onClick={onConfirmPayment} className="w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("ive_received_the_payment")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
