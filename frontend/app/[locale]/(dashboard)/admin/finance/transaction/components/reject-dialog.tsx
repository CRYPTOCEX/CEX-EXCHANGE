"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionMessage: string;
  onRejectionMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReject: () => void;
  isLoading: boolean;
}

export const RejectDialog: React.FC<RejectDialogProps> = ({
  open,
  onOpenChange,
  rejectionMessage,
  onRejectionMessageChange,
  onReject,
  isLoading,
}) => {
  const t = useTranslations("dashboard");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t("reject_transaction")}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t("provide_a_reason_for_rejection")}.{" "}
          {t("this_message_will_current_metadata")}.
        </DialogDescription>
        <Textarea
          title="Rejection Reason"
          value={rejectionMessage}
          onChange={onRejectionMessageChange}
          rows={6}
          placeholder="Enter rejection reason"
          className="w-full p-2 border-zinc-200 dark:border-zinc-700 rounded-md"
        />
        <DialogFooter>
          <Button color="destructive" onClick={onReject} disabled={isLoading}>
            {t("reject_transaction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
