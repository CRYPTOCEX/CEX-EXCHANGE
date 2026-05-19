"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface DisputeDialogProps {
  children: React.ReactNode;
  onSubmit: (reason: string, description: string) => Promise<void>;
  loading: boolean;
  userRole: "buyer" | "seller";
}

const DISPUTE_REASONS = [
  {
    value: "PAYMENT_NOT_RECEIVED",
    label: "Payment Not Received",
    description: "I completed my part but did not receive payment",
    forRoles: ["seller"], // Only seller can claim payment not received
  },
  {
    value: "PAYMENT_INCORRECT_AMOUNT",
    label: "Incorrect Payment Amount",
    description: "The payment amount was different from agreed",
    forRoles: ["seller"], // Only seller receives payment, so only they can report incorrect amount
  },
  {
    value: "CRYPTO_NOT_RELEASED",
    label: "Crypto Not Released",
    description: "I sent payment but seller has not released the crypto",
    forRoles: ["buyer"], // Only buyer can claim crypto wasn't released
  },
  {
    value: "SELLER_UNRESPONSIVE",
    label: "Seller Unresponsive",
    description: "The seller is not responding to messages",
    forRoles: ["buyer"], // Only buyer reports seller issues
  },
  {
    value: "BUYER_UNRESPONSIVE",
    label: "Buyer Unresponsive",
    description: "The buyer is not responding to messages",
    forRoles: ["seller"], // Only seller reports buyer issues
  },
  {
    value: "FRAUDULENT_ACTIVITY",
    label: "Fraudulent Activity",
    description: "I suspect fraudulent or scam activity",
    forRoles: ["buyer", "seller"], // Both can report fraud
  },
  {
    value: "TERMS_VIOLATION",
    label: "Terms Violation",
    description: "The other party violated the trade terms",
    forRoles: ["buyer", "seller"], // Both can report terms violation
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Other reason not listed above",
    forRoles: ["buyer", "seller"], // Both can use other
  },
];

export function DisputeDialog({ children, onSubmit, loading, userRole }: DisputeDialogProps) {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Filter reasons based on user role
  const filteredReasons = DISPUTE_REASONS.filter((r) =>
    r.forRoles.includes(userRole)
  );

  const handleSubmit = async () => {
    setError("");

    if (!reason) {
      setError("Please select a reason for the dispute");
      return;
    }

    if (!description || description.trim().length < 20) {
      setError("Please provide a detailed description (minimum 20 characters)");
      return;
    }

    try {
      await onSubmit(reason, description.trim());
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (err) {
      setError("Failed to submit dispute. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("open_dispute")}
          </DialogTitle>
          <DialogDescription>
            {t("please_provide_details_about_the_dispute")} {t("our_support_team_will_review_within_24_hours")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{tExt("dispute_reason")} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason" className="text-left">
                <SelectValue placeholder={tCommon("select_a_reason")} />
              </SelectTrigger>
              <SelectContent>
                {filteredReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-left">
                    <div className="flex flex-col items-start text-left">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {tCommon("description")}{" "}
              <span className="text-xs text-muted-foreground">
                ({description.length}/1000)
              </span>
            </Label>
            <Textarea
              id="description"
              placeholder={t("please_provide_a_detailed_explanation_of_the_issue")}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={6}
              className="resize-none"
            />
            {description.length > 0 && description.length < 20 && (
              <p className="text-xs text-yellow-600">
                {t("please_provide_at_least")} {20 - description.length} {t("more_characters")}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-medium mb-1">{tExt("important")}</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>{t("opening_a_dispute_will_freeze_the_trade")}</li>
              <li>{t("admin_will_review_both_parties_evidence")}</li>
              <li>{t("false_disputes_may_affect_your_reputation")}</li>
              <li>{t("response_time_24_48_hours")}</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !reason || description.trim().length < 20}
          >
            {loading ? "Submitting..." : "Submit Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
