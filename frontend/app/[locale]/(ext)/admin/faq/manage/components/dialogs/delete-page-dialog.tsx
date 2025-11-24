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

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface DeletePageDialogProps {
  page: PageLink | null;
  faqCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function DeletePageDialog({
  page,
  faqCount,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: DeletePageDialogProps) {
  const t = useTranslations("ext");
  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("delete_page_and_faqs")}
          </DialogTitle>
          <DialogDescription>
            {t("are_you_sure_you_want_to_delete_the_page")}
            <strong>{page.name}</strong>
            {t("and_all_its_faqs_this_action_cannot_be_undone")}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-md bg-destructive/10 p-4 text-sm">
            <p>{t("this_will_permanently_delete")}</p>
            <ul className="list-disc pl-5 mt-2">
              <li>
                {t("the_page_association_for")}
                <strong>{page.path}</strong>
              </li>
              <li>
                <strong>{faqCount}</strong>
                {t("faqs_associated_with_this_page")}
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting..." : "Delete Page and FAQs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
