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
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";
import $fetch from "@/lib/api";
import { Link } from "@/i18n/routing";

export default function AdminMerchantsPage() {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const columns = useColumns();
  const formConfig = useFormConfig();
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
          title: "Error",
          description: typeof error === 'string' ? error : "An error occurred",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Action completed",
          description: `Successfully ${getActionVerb(confirmDialog.type)} merchant ${confirmDialog.merchantName}`,
        });
        if (refreshFn) {
          refreshFn();
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setConfirmDialog({ ...confirmDialog, open: false });
      setRefreshFn(null);
    }
  };

  const extraRowActions = (row: any, refresh?: () => void) => {
    return (
      <>
        {row.status === "PENDING" && (
          <>
            <DropdownMenuItem onClick={() => handleAction("approve", row, refresh)}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Approve Merchant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction("reject", row, refresh)}>
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Reject Merchant
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {row.status === "ACTIVE" && (
          <DropdownMenuItem onClick={() => handleAction("suspend", row, refresh)}>
            <Ban className="mr-2 h-4 w-4 text-orange-500" />
            Suspend Merchant
          </DropdownMenuItem>
        )}
        {row.status === "SUSPENDED" && (
          <DropdownMenuItem onClick={() => handleAction("approve", row, refresh)}>
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Reactivate Merchant
          </DropdownMenuItem>
        )}
        {row.verificationStatus !== "VERIFIED" && (
          <DropdownMenuItem onClick={() => handleAction("verify", row, refresh)}>
            <Shield className="mr-2 h-4 w-4 text-blue-500" />
            Verify Merchant
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
        title="Gateway Merchants"
        description="Manage registered merchant accounts"
        itemTitle="Merchant"
        columns={columns}
        formConfig={formConfig}
        isParanoid={false}
        extraRowActions={extraRowActions}
        design={{
          animation: "orbs",
          primaryColor: "indigo",
          secondaryColor: "cyan",
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
                "This will activate the merchant account and allow them to accept payments."}
              {confirmDialog.type === "suspend" &&
                "This will suspend the merchant account. They won't be able to accept payments."}
              {confirmDialog.type === "verify" &&
                "This will mark the merchant as verified."}
              {confirmDialog.type === "reject" &&
                "This will reject the merchant application."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to {confirmDialog.type} merchant{" "}
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
              {processing ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
