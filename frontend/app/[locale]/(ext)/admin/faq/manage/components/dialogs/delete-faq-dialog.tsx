"use client";
import { useFAQAdminStore } from "@/store/faq/admin";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
interface DeleteFAQDialogProps {
  faq: faqAttributes | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}
export function DeleteFAQDialog({
  faq,
  open,
  onOpenChange,
  onConfirm,
}: DeleteFAQDialogProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const { deleteFAQ } = useFAQAdminStore();
  const handleDelete = async () => {
    if (!faq) return;
    try {
      await deleteFAQ(faq.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast({
        title: "Error",
        description: "Failed to delete FAQ. Please try again.",
        variant: "destructive",
      });
    }
  };
  if (!faq) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete_faq")}</AlertDialogTitle>
          <AlertDialogDescription>
            {" "}
            {t("this_will_permanently_delete_the_faq")} {faq.question} .<br />
            <br /> {t("this_action_cannot_be_undone")}.{" "}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} variant="destructive">
            {" "}
            {t("Delete")}{" "}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
