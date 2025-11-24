"use client";

import React, { useState } from "react";
import { XCircle as XCircleIcon, CheckCircle2, ThumbsDown, Eye, Edit } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";
import { columns } from "./columns";
import { offersAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import OfferDetailsDrawer from "./offer-details-drawer";
import OfferEditDrawer from "./offer-edit-drawer";

export default function AdminOffersPage() {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "", // "disable" | "flag" | "approve" | "reject"
    offerId: "",
    offerName: "",
  });
  
  // Drawer states for view
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Drawer states for edit
  const [editOfferId, setEditOfferId] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [refreshCallback, setRefreshCallback] = useState<(() => void) | undefined>(undefined);

  // Get action functions from your admin offers store.
  const { approveOffer, rejectOffer, flagOffer, disableOffer } =
    adminOffersStore();

  // Open offer details in drawer
  const openOfferDrawer = (offerId: string) => {
    setSelectedOfferId(offerId);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOfferId(null);
  };
  
  // Open edit drawer
  const openEditDrawer = (offerId: string, refresh?: () => void) => {
    setEditOfferId(offerId);
    setIsEditDrawerOpen(true);
    setRefreshCallback(() => refresh);
  };
  
  const closeEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setEditOfferId(null);
    setRefreshCallback(undefined);
  };

  // Action handler: sets up the confirmation dialog.
  const handleAction = (
    type: "disable" | "flag" | "approve" | "reject",
    offer: any
  ) => {
    setConfirmDialog({
      open: true,
      type,
      offerId: offer.id,
      offerName: `${offer.type} ${offer.crypto} at ${offer.price}`,
    });
  };

  // Returns a descriptive verb.
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

  // Confirm action: calls the store action based on the action type.
  const confirmAction = async () => {
    try {
      switch (confirmDialog.type) {
        case "approve":
          await approveOffer(confirmDialog.offerId);
          break;
        case "reject":
          await rejectOffer(
            confirmDialog.offerId,
            "Does not meet platform standards"
          );
          break;
        case "flag":
          await flagOffer(
            confirmDialog.offerId,
            "Suspicious activity detected"
          );
          break;
        case "disable":
          await disableOffer(confirmDialog.offerId, "Violates platform terms");
          break;
      }
      toast({
        title: "Action completed",
        description: `Successfully ${getActionVerb(confirmDialog.type)} offer ${confirmDialog.offerId}`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Unknown error during action",
        variant: "destructive",
      });
    } finally {
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Extra row actions for each offer row in the DataTable.
  const extraRowActions = (row: any) => {
    return (
      <>
        {/* If offer is pending, show approve and reject */}
        {row.status === "pending" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("approve", row)}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              {t("approve_offer")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("reject", row)}>
              <XCircleIcon className="mr-2 h-4 w-4 text-red-500" />
              {t("reject_offer")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {/* For other statuses, allow flagging */}
        {row.status !== "pending" && (
          <DropdownMenuItem onClick={() => handleAction("flag", row)}>
            <ThumbsDown className="mr-2 h-4 w-4 text-orange-500" />
            {t("flag_offer")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => handleAction("disable", row)}
          className="text-red-600"
        >
          <XCircleIcon className="mr-2 h-4 w-4" />
          {t("disable_offer")}
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <>
      <DataTable
        apiEndpoint="/api/admin/p2p/offer"
        model="p2pOffer"
        permissions={{
          access: "access.p2p.offer",
          view: "view.p2p.offer",
          create: "create.p2p.offer",
          edit: "edit.p2p.offer",
          delete: "delete.p2p.offer",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={false}
        canDelete={true}
        canView={true}
        title="Offers"
        itemTitle="Offer"
        columns={columns}
        analytics={offersAnalytics}
        isParanoid={true}
        extraRowActions={extraRowActions}
        expandedButtons={(row, refresh) => (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => openOfferDrawer(row.id)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {t("view_details")}
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => openEditDrawer(row.id, refresh)}
            >
              <Edit className="h-4 w-4 mr-1" />
              {t("Edit")}
            </Button>
          </div>
        )}
      />

      {/* Confirmation Dialog for extra action */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent className="dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>
              {t("Confirm")}
              {confirmDialog.type}
              {t("Offer")}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "disable" &&
                "This will remove the offer from the platform."}
              {confirmDialog.type === "flag" &&
                "This will mark the offer for further review."}
              {confirmDialog.type === "approve" &&
                "This will make the offer visible on the platform."}
              {confirmDialog.type === "reject" &&
                "This will reject the offer and notify the user."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              {t("are_you_sure_you_want_to")}{" "}
              {confirmDialog.type}{" "}
              {t("the_offer")} <strong>{confirmDialog.offerName}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, open: false })
              }
            >
              {t("Cancel")}
            </Button>
            <Button onClick={confirmAction}>{t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Details Drawer */}
      <OfferDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        offerId={selectedOfferId}
      />
      
      {/* Offer Edit Drawer */}
      <OfferEditDrawer
        isOpen={isEditDrawerOpen}
        onClose={closeEditDrawer}
        offerId={editOfferId}
        onSuccess={() => {
          if (refreshCallback) {
            refreshCallback();
          }
          closeEditDrawer();
        }}
      />
    </>
  );
}
