"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

interface ActionDialogProps {
  open: boolean;
  type: "approve" | "reject" | "flag" | "disable";
  notes: string;
  onOpenChange: (open: boolean) => void;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
}

export function ActionDialog({
  open,
  type,
  notes,
  onOpenChange,
  onNotesChange,
  onConfirm,
}: ActionDialogProps) {
  const t = useTranslations("ext");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("Confirm")}
            {type}
            {t("offer")}
          </DialogTitle>
          <DialogDescription>
            {type === "approve" &&
              "This will make the offer visible on the platform."}
            {type === "reject" &&
              "This will reject the offer and notify the user."}
            {type === "flag" && "This will mark the offer for further review."}
            {type === "disable" &&
              "This will remove the offer from the platform."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">
            {t("are_you_sure_you_want_to")}
            {type}
            {t("this_offer")}
          </p>
          <Textarea
            placeholder={`Reason for ${type}ing this offer...`}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            variant={
              type === "approve"
                ? "default"
                : type === "disable" || type === "reject"
                  ? "destructive"
                  : "secondary"
            }
            onClick={onConfirm}
          >
            {t("Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
