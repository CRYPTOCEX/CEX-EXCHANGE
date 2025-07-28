"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";

import { OfferHeader } from "./components/offer-header";
import { OfferDetailsCard } from "./components/offer-details-card";
import { UserInfoCard } from "./components/user-info-card";
import { ActivityLogTab } from "./components/activity-log-tab";
import { RelatedTradesTab } from "./components/related-trades-tab";
import { AdminNotesTab } from "./components/admin-notes-tab";
import { ActionDialog } from "./components/action-dialog";
import { OfferDetailsSkeleton } from "./components/offer-details-skeleton";
import { useRouter } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

export function AdminOfferDetailsClient() {
  const t = useTranslations("ext");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "approve" | "reject" | "flag" | "disable";
    notes: string;
  }>({
    open: false,
    type: "approve",
    notes: "",
  });

  const {
    offer,
    isLoadingOffer,
    offerError,
    getOfferById,
    approveOffer,
    rejectOffer,
    flagOffer,
    disableOffer,
  } = adminOffersStore();

  useEffect(() => {
    if (params.id) {
      getOfferById(params.id as string);
    }
  }, [params.id, getOfferById]);

  const handleAction = (type: "approve" | "reject" | "flag" | "disable") => {
    setActionDialog({
      open: true,
      type,
      notes: "",
    });
  };

  const handleEdit = () => {
    router.push(`/admin/offers/${params.id}/edit`);
  };

  const handleNotesChange = (notes: string) => {
    setActionDialog({ ...actionDialog, notes });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setActionDialog({ ...actionDialog, open });
  };

  const confirmAction = async () => {
    try {
      switch (actionDialog.type) {
        case "approve":
          await approveOffer(params.id as string, actionDialog.notes);
          break;
        case "reject":
          await rejectOffer(params.id as string, actionDialog.notes);
          break;
        case "flag":
          await flagOffer(params.id as string, actionDialog.notes);
          break;
        case "disable":
          await disableOffer(params.id as string, actionDialog.notes);
          break;
      }

      toast({
        title: "Action completed",
        description: `Successfully ${getActionVerb(actionDialog.type)} offer ${params.id}`,
      });
      setActionDialog({ ...actionDialog, open: false });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to ${actionDialog.type} offer: ${err instanceof Error ? err.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const getActionVerb = (type: string) => {
    switch (type) {
      case "disable":
        return "disabled";
      case "flag":
        return "flagged";
      case "approve":
        return "approved";
      case "reject":
        return "rejected";
      default:
        return "updated";
    }
  };

  if (isLoadingOffer) {
    return <OfferDetailsSkeleton />;
  }

  if (offerError) {
    return (
      <div className="space-y-6">
        <OfferHeader
          offerId={params.id as string}
          status=""
          onAction={handleAction}
          onEdit={handleEdit}
        />
        <div className="rounded-md bg-destructive/10 p-4 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground">
          <h3 className="font-medium">{t("error_loading_offer")}</h3>
          <p>{offerError}</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="space-y-6">
        <OfferHeader
          offerId={params.id as string}
          status=""
          onAction={handleAction}
          onEdit={handleEdit}
        />
        <div className="rounded-md border border-muted p-4 dark:border-slate-700">
          <h3 className="font-medium">{t("offer_not_found")}</h3>
          <p className="text-muted-foreground">
            {t("the_requested_offer_could_not_be_found")}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OfferHeader
        offerId={offer.id}
        status={offer.status}
        onAction={handleAction}
        onEdit={handleEdit}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <OfferDetailsCard offer={offer} />
        <UserInfoCard user={offer.user} />
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">{t("activity_log")}</TabsTrigger>
          <TabsTrigger value="trades">{t("related_trades")}</TabsTrigger>
          <TabsTrigger value="notes">{t("admin_notes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="mt-4">
          <ActivityLogTab activityLog={offer.activityLog || []} />
        </TabsContent>
        <TabsContent value="trades" className="mt-4">
          <RelatedTradesTab />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <AdminNotesTab />
        </TabsContent>
      </Tabs>

      <ActionDialog
        open={actionDialog.open}
        type={actionDialog.type}
        notes={actionDialog.notes}
        onOpenChange={handleDialogOpenChange}
        onNotesChange={handleNotesChange}
        onConfirm={confirmAction}
      />
    </div>
  );
}
