"use client";

import type React from "react";

import { useState, useRef } from "react";
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
  X,
  Loader2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { getCurrencySymbol } from "@/utils/currency";
import { isWaitingPayment, isPaymentSent, isExpired, isCompleted } from "@/utils/p2p-status";
import { imageUploader } from "@/utils/upload";

interface TradePaymentProps {
  trade: any;
  onConfirmPayment: (receiptUrl?: string) => Promise<void>;
}

export function TradePayment({ trade, onConfirmPayment }: TradePaymentProps) {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [reference, setReference] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const currencySymbol = getCurrencySymbol(trade.offer?.priceCurrency || "USD");

  const canConfirmPayment = isWaitingPayment(trade.status) && trade.type === "buy";

  const copyPaymentDetails = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast({
      title: "Copied to clipboard",
      description: "Payment details have been copied to your clipboard.",
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setReceiptFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    let receiptUrl: string | undefined;

    // Upload receipt if provided
    if (receiptFile) {
      setIsUploading(true);
      try {
        const uploadResult = await imageUploader({
          file: receiptFile,
          dir: `p2p/receipts/${trade.id}`,
          size: { maxWidth: 1920, maxHeight: 1920 },
        });

        if (uploadResult.success && uploadResult.url) {
          receiptUrl = uploadResult.url;
        } else {
          toast({
            title: "Upload failed",
            description: "Failed to upload receipt image. Please try again.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "Failed to upload receipt image. Please try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    await onConfirmPayment(receiptUrl);
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{tCommon("payment_details")}</CardTitle>
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
        {isWaitingPayment(trade.status) ? (
          <>
            <div className="rounded-md border p-4 bg-muted/30">
              <h3 className="font-medium mb-4 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                {tCommon("payment_instructions")}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {tCommon("payment_method")}
                    </p>
                    <p className="font-medium">{trade.paymentDetails?.name || trade.paymentMethodDetails?.name || trade.paymentMethod}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(trade.paymentDetails?.name || trade.paymentMethodDetails?.name || trade.paymentMethod, "method")
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

                {/* Dynamic payment details from metadata */}
                {trade.paymentDetails && Object.entries(trade.paymentDetails)
                  .filter(([key]) => !["name", "icon", "instructions", "processingTime"].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {key}
                          </p>
                          <p className="font-medium">
                            {String(value)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            copyPaymentDetails(String(value), key)
                          }
                          className="h-8 w-8"
                        >
                          {copied === key ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Separator />
                    </div>
                  ))
                }

                {/* Show instructions if available */}
                {trade.paymentDetails?.instructions && (
                  <div>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {tCommon("instructions")}
                        </p>
                        <p className="font-medium whitespace-pre-wrap">
                          {trade.paymentDetails.instructions}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          copyPaymentDetails(trade.paymentDetails.instructions, "instructions")
                        }
                        className="h-8 w-8"
                      >
                        {copied === "instructions" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Separator />
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {tCommon("amount_to_send")}
                    </p>
                    <p className="font-medium">
                      {currencySymbol}{trade.total.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyPaymentDetails(
                        `${currencySymbol}${trade.total.toLocaleString()}`,
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
                      {t("reference")}
                    </p>
                    <p className="font-medium">
                      TRADE-{trade.id}
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
              <AlertTitle>{tExt("important")}</AlertTitle>
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
                    placeholder={t("enter_the_reference_or_transaction_id")}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof-note">
                    {t("additional_notes_optional")}
                  </Label>
                  <Textarea
                    id="proof-note"
                    placeholder={t("add_any_additional_information_about_your_payment")}
                    value={proofNote}
                    onChange={(e) => setProofNote(e.target.value)}
                  />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-2">
                  <Label>{t("payment_receipt")} ({tCommon("optional")})</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="receipt-upload"
                  />
                  {receiptPreview ? (
                    <div className="relative rounded-lg border overflow-hidden">
                      <img
                        src={receiptPreview}
                        alt={t("receipt_preview")}
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleRemoveReceipt}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {t("click_to_upload_receipt")}
                        </span>
                      </div>
                    </Button>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {tCommon('uploading_ellipsis')}...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {t("confirm_payment_sent")}
                    </>
                  )}
                </Button>
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
              <h4 className="font-medium mb-2">{tCommon("payment_details")}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("reference_transaction_id")}
                  </span>
                  <span>{trade.paymentReference || "TX123456789"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tCommon("payment_method")}
                  </span>
                  <span>{trade.paymentDetails?.name || trade.paymentMethodDetails?.name || trade.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tCommon("amount")}</span>
                  <span>
                    {currencySymbol}{trade.total.toLocaleString()}
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
              {tCommon("payment")}{" "}
              {isCompleted(trade.status) ? "Completed" : isExpired(trade.status) ? "Expired" : "Not Required"}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {isCompleted(trade.status)
                ? "Payment has been confirmed and the trade has been completed successfully."
                : trade.status === "disputed"
                  ? "This trade is under dispute. Payment verification is on hold."
                  : isExpired(trade.status)
                    ? "This trade has expired. No payment was made within the allowed time window."
                    : "No payment is required at this stage of the trade."}
            </p>
          </div>
        )}
      </CardContent>
      {trade.status === "payment_confirmed" && trade.type === "sell" && (
        <CardFooter>
          <Button onClick={() => onConfirmPayment()} className="w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("ive_received_the_payment")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
