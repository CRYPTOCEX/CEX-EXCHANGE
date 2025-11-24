"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

interface BulkActionDialogProps {
  action: "activate" | "deactivate" | "delete" | null;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function BulkActionDialog({
  action,
  count,
  open,
  onOpenChange,
  onConfirm,
}: BulkActionDialogProps) {
  const t = useTranslations("ext");
  if (!action) return null;

  const actionText = {
    activate: "activate",
    deactivate: "deactivate",
    delete: "delete",
  }[action];

  const actionTitle = {
    activate: "Activate FAQs",
    deactivate: "Deactivate FAQs",
    delete: "Delete FAQs",
  }[action];

  const actionDescription = {
    activate: "This will make the selected FAQs visible to users.",
    deactivate: "This will hide the selected FAQs from users.",
    delete:
      "This will permanently delete the selected FAQs. This action cannot be undone.",
  }[action];

  const actionButtonVariant = {
    activate: "default",
    deactivate: "outline",
    delete: "destructive",
  }[action] as "default" | "destructive" | "outline";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {actionDescription}
            <br />
            <br />
            {t("are_you_sure_you_want_to")}
            {actionText} {count} {count === 1 ? "FAQ" : "FAQs"}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant={actionButtonVariant}>
            {actionText.charAt(0).toUpperCase() + actionText.slice(1)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
