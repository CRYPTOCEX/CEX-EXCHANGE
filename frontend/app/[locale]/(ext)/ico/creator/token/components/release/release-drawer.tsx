"use client";

import { useState } from "react";
import { Send, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTokenReleaseStore } from "@/store/ico/token-release-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatNumber } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";

interface ReleaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  tokenId: string;
  onSuccess: () => void;
}

export function ReleaseDrawer({
  isOpen,
  onClose,
  transactionId,
  tokenId,
  onSuccess,
}: ReleaseDrawerProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const [releaseUrl, setReleaseUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");

  const { submitReleaseUrl, getTransactionById } = useTokenReleaseStore();
  const transaction = transactionId ? getTransactionById(transactionId) : null;

  const handleSubmit = async () => {
    if (step === "form") {
      if (!transactionId || !releaseUrl.trim()) {
        toast({
          title: "Error",
          description: "Please enter a valid release URL",
          variant: "destructive",
        });
        return;
      }

      // Validate URL format on client side.
      try {
        new URL(releaseUrl);
      } catch (error) {
        toast({
          title: "Error",
          description: "Please enter a valid release URL",
          variant: "destructive",
        });
        return;
      }

      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      setIsSubmitting(true);
      try {
        await submitReleaseUrl(tokenId, transactionId!, releaseUrl);
        setStep("success");
      } catch (error) {
        setStep("form");
      } finally {
        setIsSubmitting(false);
      }
    }

    if (step === "success") {
      setReleaseUrl("");
      setStep("form");
      onSuccess();
    }
  };

  const handleClose = () => {
    setReleaseUrl("");
    setStep("form");
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>
              {step === "form" && "Release Tokens"}
              {step === "confirm" && "Confirm Transaction"}
              {step === "success" && "Transaction Submitted"}
            </DrawerTitle>
            <DrawerDescription>
              {step === "form" &&
                "Submit the release URL after sending tokens to the investor."}
              {step === "confirm" &&
                "Please verify the transaction details before submitting."}
              {step === "success" &&
                "Your transaction has been submitted successfully."}
            </DrawerDescription>
          </DrawerHeader>

          {transaction && (
            <div className="px-4 py-2">
              {step === "form" && (
                <>
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t("Investor")}
                        </p>
                        <p className="font-medium">
                          {transaction.user
                            ? `${transaction.user.firstName} ${transaction.user.lastName}`
                            : "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t("Amount")}
                        </p>
                        <p className="font-medium">
                          {formatNumber(transaction.amount)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t("wallet_address")}
                      </p>
                      <p className="font-medium break-all text-sm font-mono bg-muted/50 p-2 rounded-md">
                        {transaction.walletAddress || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <Label htmlFor="release-url">{t("release_url")}</Label>
                    <Input
                      id="release-url"
                      placeholder="https://..."
                      value={releaseUrl}
                      onChange={(e) => setReleaseUrl(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("enter_the_release_the_tokens")}.
                    </p>
                  </div>

                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t("Important")}</AlertTitle>
                    <AlertDescription>
                      {t("make_sure_you_release_url")}.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {step === "confirm" && (
                <div className="space-y-4 mb-6">
                  <Alert
                    variant="default"
                    className="border-primary/50 bg-primary/5"
                  >
                    <AlertTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {t("confirm_transaction_details")}
                    </AlertTitle>
                    <AlertDescription>
                      {t("please_verify_that_token_release")}.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t("Investor")}
                      </p>
                      <p className="font-medium">
                        {transaction.user
                          ? `${transaction.user.firstName} ${transaction.user.lastName}`
                          : "Unknown"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t("token_amount")}
                      </p>
                      <p className="font-medium">
                        {formatNumber(transaction.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t("wallet_address")}
                      </p>
                      <p className="font-mono text-sm break-all">
                        {transaction.walletAddress || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t("release_url")}
                      </p>
                      <p className="font-mono text-sm break-all bg-background p-2 rounded border">
                        {releaseUrl}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === "success" && (
                <div className="space-y-4 mb-6 text-center py-6">
                  <div className="mx-auto bg-green-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-medium">
                    {t("transaction_submitted")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("your_transaction_has_for_verification")}.{" "}
                    {t("the_investor_will_is_complete")}.
                  </p>
                  <div className="bg-muted/30 p-3 rounded-lg mt-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("release_url")}
                    </p>
                    <p className="font-mono text-sm break-all">{releaseUrl}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DrawerFooter>
            <Button
              onClick={handleSubmit}
              disabled={step === "form" && (!releaseUrl.trim() || isSubmitting)}
              className={
                step === "success" ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-background mr-2"></div>
                  {t("Submitting")}.
                </>
              ) : (
                <>
                  {step === "form" && (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("Continue")}
                    </>
                  )}
                  {step === "confirm" && (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("submit_transaction")}
                    </>
                  )}
                  {step === "success" && (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t("Done")}
                    </>
                  )}
                </>
              )}
            </Button>
            {step !== "success" && (
              <DrawerClose asChild>
                <Button variant="outline" onClick={handleClose}>
                  {t("Cancel")}
                </Button>
              </DrawerClose>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
