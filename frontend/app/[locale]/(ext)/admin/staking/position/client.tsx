"use client";

import React, { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import StakingPositionDetails from "./components/details";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStakingAdminPositionsStore } from "@/store/staking/admin/position";
import { useTranslations } from "next-intl";

export default function PositionsManagement() {
  const t = useTranslations("ext");
  const updatePosition = useStakingAdminPositionsStore(
    (state) => state.updatePosition
  );

  // State for confirmation dialog for extra row actions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [confirmRow, setConfirmRow] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handler for confirming withdrawal action from extra row actions
  const handleConfirm = async () => {
    if (!confirmRow || !confirmAction) return;
    setIsProcessing(true);
    try {
      if (confirmAction === "approve") {
        await updatePosition(confirmRow.id, {
          status: "COMPLETED",
          updatedAt: new Date(),
        });
      } else if (confirmAction === "reject") {
        await updatePosition(confirmRow.id, {
          withdrawalRequested: false,
          withdrawalRequestDate: null,
          updatedAt: new Date(),
        });
      }
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error("Error updating position:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Define extra row actions for withdrawal approval/rejection using the dialog
  const extraRowActions = (row: any) => {
    if (row.withdrawalRequested && row.status === "PENDING_WITHDRAWAL") {
      return (
        <>
          <DropdownMenuItem
            onClick={() => {
              setConfirmRow(row);
              setConfirmAction("approve");
              setConfirmDialogOpen(true);
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            {t("approve_withdrawal")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setConfirmRow(row);
              setConfirmAction("reject");
              setConfirmDialogOpen(true);
            }}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
            {t("reject_withdrawal")}
          </DropdownMenuItem>
        </>
      );
    }
    return null;
  };

  return (
    <>
      <DataTable
        apiEndpoint="/api/admin/staking/position"
        model="stakingPosition"
        permissions={{
          access: "access.staking.position",
          view: "view.staking.position",
          create: "create.staking.position",
          edit: "edit.staking.position",
          delete: "delete.staking.position",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={false}
        canDelete={true}
        canView={true}
        isParanoid={true}
        title="Manage Staking Positions"
        itemTitle="Staking Position"
        description="Review and manage staking positions"
        columns={columns}
        analytics={analytics}
        extraRowActions={extraRowActions}
        viewContent={(row) => <StakingPositionDetails row={row} />}
      />

      {/* Shared Confirmation Dialog for extra row actions */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve"
                ? "Approve Withdrawal"
                : "Reject Withdrawal"}
            </DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to")}{" "}
              {confirmAction === "approve" ? "approve" : "reject"}
              {t("this_withdrawal_request")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : confirmAction === "approve" ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
