"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface ResolutionFormProps {
  resolutionDetails: {
    outcome: string;
    notes: string;
  };
  setResolutionDetails: (details: { outcome: string; notes: string }) => void;
  handleResolveDispute: () => Promise<void>;
  isSubmitting: boolean;
}

export function ResolutionForm({
  resolutionDetails,
  setResolutionDetails,
  handleResolveDispute,
  isSubmitting,
}: ResolutionFormProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case "BUYER_WINS":
        return t("resolve_for_buyer");
      case "SELLER_WINS":
        return t("resolve_for_seller");
      case "SPLIT":
        return t("split_resolution");
      default:
        return outcome;
    }
  };

  const handleSubmitClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setShowConfirmModal(false);
    await handleResolveDispute();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("resolve_dispute")}</CardTitle>
          <CardDescription>
            {t("make_a_final_decision_on_this_dispute")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="outcome">{t("resolution_outcome")}</Label>
              <Select
                value={resolutionDetails.outcome}
                onValueChange={(value) =>
                  setResolutionDetails({ ...resolutionDetails, outcome: value })
                }
              >
                <SelectTrigger id="outcome">
                  <SelectValue placeholder={t("select_outcome")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUYER_WINS">{t("resolve_for_buyer")}</SelectItem>
                  <SelectItem value="SELLER_WINS">
                    {t("resolve_for_seller")}
                  </SelectItem>
                  <SelectItem value="SPLIT">{t("split_resolution")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("resolution_notes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("enter_details_about_the_resolution_ellipsis")}
                value={resolutionDetails.notes}
                onChange={(e) =>
                  setResolutionDetails({
                    ...resolutionDetails,
                    notes: e.target.value,
                  })
                }
                className="min-h-[100px]"
              />
            </div>

            <Button
              onClick={handleSubmitClick}
              disabled={isSubmitting || !resolutionDetails.outcome}
              className="w-full"
            >
              {isSubmitting ? tCommon("processing") : t("submit_resolution")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t("confirm_resolution")}
            </DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to_resolve_this_dispute")}{" "}
              <strong>{getOutcomeLabel(resolutionDetails.outcome)}</strong>?{" "}
              {tCommon("this_action_cannot_be_undone")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? tCommon("processing") : tCommon("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
