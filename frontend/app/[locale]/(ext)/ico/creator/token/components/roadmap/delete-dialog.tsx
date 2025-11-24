"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type DeleteConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isSubmitting: boolean;
};

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onDelete,
  isSubmitting,
}: DeleteConfirmationDialogProps) {
  const t = useTranslations("ext");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-lg font-medium">{t("confirm_deletion")}</h3>
          </div>
          <p>{t("are_you_sure_be_undone")}.</p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("Delete")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
