"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Shield,
  Ban,
  Eye,
  Store,
} from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import type { RowActionContext } from "@/components/blocks/data-table/types/table";
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
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { useTranslations } from "next-intl";
import $fetch from "@/lib/api";
import { Link } from "@/i18n/routing";

export default function AdminMerchantsPage() {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: "",
    merchantId: "",
    merchantName: "",
  });
  const [processing, setProcessing] = useState(false);
  const [refreshFn, setRefreshFn] = useState<(() => void) | null>(null);

  const handleAction = (
    type: "approve" | "suspend" | "verify" | "reject",
    merchant: any,
    refresh?: () => void
  ) => {
    setConfirmDialog({
      open: true,
      type,
      merchantId: merchant.id,
      merchantName: merchant.name,
    });
    if (refresh) {
      setRefreshFn(() => refresh);
    }
  };

  const getActionVerb = (type: string) => {
    switch (type) {
      case "approve":
        return "approved";
      case "suspend":
        return "suspended";
      case "verify":
        return "verified";
      case "reject":
        return "rejected";
      default:
        return "updated";
    }
  };

  const confirmAction = async () => {
    setProcessing(true);
    try {
      let endpoint = "";
      let body = {};

      switch (confirmDialog.type) {
        case "approve":
          endpoint = `/api/admin/gateway/merchant/${confirmDialog.merchantId}/status`;
          body = { status: "ACTIVE" };
          break;
        case "suspend":
          endpoint = `/api/admin/gateway/merchant/${confirmDialog.merchantId}/status`;
          body = { status: "SUSPENDED" };
          break;
        case "verify":
          endpoint = `/api/admin/gateway/merchant/${confirmDialog.merchantId}/verify`;
          body = { verificationStatus: "VERIFIED" };
          break;
        case "reject":
          endpoint = `/api/admin/gateway/merchant/${confirmDialog.merchantId}/status`;
          body = { status: "REJECTED" };
          break;
      }

      const { error } = await $fetch({
        url: endpoint,
        method: "PUT",
        body,
      });

      if (error) {
        toast({
          title: tCommon("error"),
          description: typeof error === 'string' ? error : tCommon("an_error_occurred"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("action_completed"),
          description: `Successfully ${getActionVerb(confirmDialog.type)} merchant ${confirmDialog.merchantName}`,
        });
        if (refreshFn) {
          refreshFn();
        }
      }
    } catch (err) {
      toast({
        title: tCommon("error"),
        description: err instanceof Error ? err.message : tCommon("unknown_error"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setConfirmDialog({ ...confirmDialog, open: false });
      setRefreshFn(null);
    }
  };

  // Every item here approves, rejects, suspends or verifies a merchant, so the
  // whole menu is behind the same `edit.gateway.merchant` the endpoints demand.
  const extraRowActions = (
    row: any,
    { canEdit, refresh }: RowActionContext
  ) => {
    if (!canEdit) return null;
    return (
      <>
        {row.status === "PENDING" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("approve", row, refresh)}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
              {t("approve_merchant")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("reject", row, refresh)}>
              <XCircle className="mr-2 h-4 w-4 text-destructive" />
              {t("reject_merchant")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {row.status === "ACTIVE" && (
          <DropdownMenuItem onClick={() => handleAction("suspend", row, refresh)}>
            <Ban className="mr-2 h-4 w-4 text-warning" />
            {t("suspend_merchant")}
          </DropdownMenuItem>
        )}
        {row.status === "SUSPENDED" && (
          <DropdownMenuItem onClick={() => handleAction("approve", row, refresh)}>
            <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
            {t("reactivate_merchant")}
          </DropdownMenuItem>
        )}
        {row.verificationStatus !== "VERIFIED" && (
          <DropdownMenuItem onClick={() => handleAction("verify", row, refresh)}>
            <Shield className="mr-2 h-4 w-4 text-primary" />
            {t("verify_merchant")}
          </DropdownMenuItem>
        )}
      </>
    );
  };

  return (
    <>
      <DataTable
        apiEndpoint="/api/admin/gateway/merchant"
        model="gatewayMerchant"
        permissions={{
          access: "access.gateway.merchant",
          view: "view.gateway.merchant",
          create: "create.gateway.merchant",
          edit: "edit.gateway.merchant",
          delete: "delete.gateway.merchant",
        }}
        pageSize={12}
        canCreate={false}
        canEdit={true}
        canDelete={true}
        canView={true}
        viewLink="/admin/gateway/merchant/[id]"
        title={t("gateway_merchants")}
        description={t("manage_registered_merchant_accounts")}
        itemTitle="Merchant"
        columns={columns}
        formConfig={formConfig}
        viewConfig={viewConfig}
        isParanoid={false}
        extraRowActions={extraRowActions}
        design={{
          icon: Store,
        }}
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {confirmDialog.type} action
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "approve" &&
                t("this_will_activate_the_merchant_account")}
              {confirmDialog.type === "suspend" &&
                t("this_will_suspend_the_merchant_account")}
              {confirmDialog.type === "verify" &&
                t("this_will_mark_the_merchant_as_verified")}
              {confirmDialog.type === "reject" &&
                t("this_will_reject_the_merchant_application")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              {tCommon("are_you_sure_you_want_to")} {confirmDialog.type} merchant{" "}
              <strong>{confirmDialog.merchantName}</strong>?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={confirmAction} disabled={processing}>
              {processing ? `${tCommon("processing")}…` : tCommon("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
