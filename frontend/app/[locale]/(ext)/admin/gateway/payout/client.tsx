"use client";

import React, { useState } from "react";
import { Eye, CheckCircle, XCircle, Wallet } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { useColumns, useFormConfig } from "./columns";
import PayoutDetailsDrawer from "./payout-details-drawer";
import $fetch from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AdminPayoutsPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openPayoutDrawer = (payoutId: string) => {
    setSelectedPayoutId(payoutId);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPayoutId(null);
  };

  const handleApprove = async (payoutId: string) => {
    const { error } = await $fetch({
      url: `/api/admin/gateway/payout/${payoutId}/approve`,
      method: "POST",
    });

    if (error) {
      toast.error(typeof error === 'string' ? error : "Failed to approve payout");
    } else {
      toast.success("Payout approved successfully");
      setRefreshKey((prev) => prev + 1);
    }
  };

  const handleReject = async (payoutId: string) => {
    const { error } = await $fetch({
      url: `/api/admin/gateway/payout/${payoutId}/reject`,
      method: "POST",
    });

    if (error) {
      toast.error(typeof error === 'string' ? error : "Failed to reject payout");
    } else {
      toast.success("Payout rejected");
      setRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <>
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/gateway/payout"
        model="gatewayPayout"
        permissions={{
          access: "access.gateway.payout",
          view: "view.gateway.payout",
          create: "create.gateway.payout",
          edit: "edit.gateway.payout",
          delete: "delete.gateway.payout",
        }}
        pageSize={12}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        canView={true}
        title={t("gateway_payouts")}
        description={t("manage_merchant_payout_requests")}
        itemTitle="Payout"
        columns={columns}
        formConfig={formConfig}
        isParanoid={false}
        expandedButtons={(row) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPayoutDrawer(row.id)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            {row.status === "PENDING" && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleApprove(row.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(row.id)}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
        design={{
          animation: "orbs",
          primaryColor: "indigo",
          secondaryColor: "cyan",
          icon: Wallet,
        }}
      />

      <PayoutDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        payoutId={selectedPayoutId}
      />
    </>
  );
}
