"use client";

import React, { useState } from "react";
import {
  XCircle as XCircleIcon,
  CheckCircle2,
  Play,
  Pause,
  AlertTriangle,
  Tag,
} from "lucide-react";
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
import { useColumns, useFormConfig } from "./columns";
import { offersAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function AdminOffersPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { toast } = useToast();
  const columns = useColumns();
  const formConfig = useFormConfig();
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "", // "disable" | "flag" | "approve" | "reject"
    offerId: "",
    offerName: "",
  });

  // Refresh callback for actions
  const [refreshCallback, setRefreshCallback] = useState<
    (() => void) | undefined
  >(undefined);

  // Get action functions from your admin offers store.
  const {
    approveOffer,
    rejectOffer,
    flagOffer,
    disableOffer,
    pauseOffer,
    activateOffer,
  } = adminOffersStore();

  // Action handler: sets up the confirmation dialog.
  const handleAction = (
    type: "disable" | "flag" | "approve" | "reject" | "pause" | "activate",
    offer: any,
    refresh?: () => void
  ) => {
    setConfirmDialog({
      open: true,
      type,
      offerId: offer.id,
      offerName: `${offer.type} ${offer.currency} offer`,
    });
    if (refresh) {
      setRefreshCallback(() => refresh);
    }
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
      case "pause":
        return "paused";
      case "activate":
        return "activated";
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
        case "pause":
          await pauseOffer(confirmDialog.offerId);
          break;
        case "activate":
          await activateOffer(confirmDialog.offerId);
          break;
      }
      toast({
        title: "Action completed",
        description: `Successfully ${getActionVerb(confirmDialog.type)} offer`,
      });
      // Refresh the table if callback is available
      if (refreshCallback) {
        refreshCallback();
      }
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
  const extraRowActions = (row: any, refresh?: () => void) => {
    const status = row.status?.toUpperCase();
    return (
      <>
        {/* If offer is pending approval, show approve and reject */}
        {(status === "PENDING_APPROVAL" || status === "PENDING") && (
          <>
            <DropdownMenuItem
              onClick={() => handleAction("approve", row, refresh)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              {t("approve_offer")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAction("reject", row, refresh)}
            >
              <XCircleIcon className="mr-2 h-4 w-4 text-red-500" />
              {t("reject_offer")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Quick status actions */}
        {status === "ACTIVE" && (
          <DropdownMenuItem onClick={() => handleAction("pause", row, refresh)}>
            <Pause className="mr-2 h-4 w-4 text-yellow-500" />
            {t("pause_offer")}
          </DropdownMenuItem>
        )}

        {(status === "PAUSED" ||
          status === "DISABLED" ||
          status === "REJECTED") && (
          <DropdownMenuItem
            onClick={() => handleAction("activate", row, refresh)}
          >
            <Play className="mr-2 h-4 w-4 text-green-500" />
            {t("activate_offer")}
          </DropdownMenuItem>
        )}

        {/* Flag action - for non-pending offers */}
        {status !== "PENDING_APPROVAL" &&
          status !== "PENDING" &&
          status !== "FLAGGED" && (
            <DropdownMenuItem
              onClick={() => handleAction("flag", row, refresh)}
            >
              <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
              {t("flag_offer")}
            </DropdownMenuItem>
          )}

        <DropdownMenuSeparator />

        {/* Disable action */}
        {status !== "DISABLED" && (
          <DropdownMenuItem
            onClick={() => handleAction("disable", row, refresh)}
            className="text-red-600"
          >
            <XCircleIcon className="mr-2 h-4 w-4" />
            {t("disable_offer")}
          </DropdownMenuItem>
        )}
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
        pageSize={12}
        canCreate={false}
        canEdit={true}
        editLink="/admin/p2p/offer/[id]/edit"
        canDelete={true}
        canView={true}
        viewLink="/admin/p2p/offer/[id]"
        title={t("p2p_offer_management")}
        description={t("manage_and_monitor_peer_to_peer_trading_offers")}
        itemTitle="Offer"
        columns={columns}
        formConfig={formConfig}
        analytics={offersAnalytics}
        isParanoid={true}
        extraRowActions={extraRowActions}
        design={{
          animation: "orbs",
          primaryColor: 'blue',
          secondaryColor: 'violet',
          icon: Tag,
        }}
      />

      {/* Confirmation Dialog for extra action */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent className="dark:border-slate-700 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>
              {tCommon("confirm")}
              {confirmDialog.type}
              {tExt("offer")}
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
              {confirmDialog.type === "pause" &&
                "This will temporarily pause the offer. It can be reactivated later."}
              {confirmDialog.type === "activate" &&
                "This will activate the offer and make it visible on the platform."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              {tCommon("are_you_sure_you_want_to")} {confirmDialog.type}{" "}
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
              {tCommon("cancel")}
            </Button>
            <Button onClick={confirmAction}>{tCommon("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
