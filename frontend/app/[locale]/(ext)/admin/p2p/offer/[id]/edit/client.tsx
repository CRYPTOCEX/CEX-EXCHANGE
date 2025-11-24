"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { useToast } from "@/hooks/use-toast";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";
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

import { EditHeader } from "./components/edit-header";
import { OfferEditForm } from "./components/offer-edit-form";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function AdminOfferEditClient() {
  const t = useTranslations("ext");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { offer, getOfferById, updateOffer, isLoadingOffer, offerError } =
    adminOffersStore();

  useEffect(() => {
    if (params.id) {
      getOfferById(params.id as string);
    }
  }, [params.id, getOfferById]);

  useEffect(() => {
    if (offer && !formData) {
      setFormData({ ...offer });
    }
  }, [offer, formData]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.price || !formData.crypto || !formData.type) {
        throw new Error("Please fill in all required fields");
      }

      if (!formData.paymentMethods || formData.paymentMethods.length === 0) {
        throw new Error("Please select at least one payment method");
      }

      // Use the store method to update the offer
      await updateOffer(params.id as string, formData);

      toast({
        title: "Offer updated",
        description: `Successfully updated offer ${params.id}`,
      });

      setHasChanges(false);
      router.push(`/admin/offers/${params.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to update offer: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      router.push(`/admin/offers/${params.id}`);
    }
  };

  const handleConfirmCancel = () => {
    setShowUnsavedDialog(false);
    router.push(`/admin/offers/${params.id}`);
  };

  if (isLoadingOffer || !formData) {
    return (
      <div className="space-y-6">
        <EditHeader
          offerId={params.id as string}
          isLoading={true}
          onSave={() => {}}
          onCancel={() => {}}
        />
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">{t("loading_offer_details")}.</p>
        </div>
      </div>
    );
  }

  if (offerError) {
    return (
      <div className="space-y-6">
        <EditHeader
          offerId={params.id as string}
          isLoading={false}
          onSave={() => {}}
          onCancel={() => router.push("/admin/offers")}
        />
        <div className="rounded-md bg-destructive/10 p-4 dark:bg-destructive/20">
          <h3 className="font-medium text-destructive dark:text-destructive-foreground">
            {t("error_loading_offer")}
          </h3>
          <p className="text-sm text-destructive/80 dark:text-destructive-foreground/80">
            {offerError}
          </p>
        </div>
      </div>
    );
  }

  // Debug section - remove in production
  const debugFormData = () => {
    console.log("Current form data:", formData);
    console.log("Payment methods:", formData?.paymentMethods);
  };

  return (
    <div className="space-y-6">
      <EditHeader
        offerId={params.id as string}
        isLoading={isSubmitting}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      <OfferEditForm offer={formData} onChange={handleFieldChange} />

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="dark:border-slate-700 dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_unsaved_changes")}. {t("are_you_sure_be_lost")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-slate-800 dark:hover:bg-slate-700">
              {t("continue_editing")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("discard_changes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
