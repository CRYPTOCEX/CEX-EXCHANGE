"use client";

import React, { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { columns } from "../../../position/columns";
import { analytics } from "../../../position/analytics";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import StakingPositionDetails from "../../../position/components/details";
import { useStakingAdminPositionsStore } from "@/store/staking/admin/position";
import { useTranslations } from "next-intl";

export default function PoolPositionsTab({ poolId }: { poolId: string }) {
  const t = useTranslations("ext");
  const updatePosition = useStakingAdminPositionsStore(
    (state) => state.updatePosition
  );

  // State for the confirmation dialog for withdrawal actions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [confirmRow, setConfirmRow] = useState<StakingPosition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Extra row actions to be passed to DataTable. Only show if withdrawal is pending.
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
            disabled={isProcessing}
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
            disabled={isProcessing}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
            {t("reject_withdrawal")}
          </DropdownMenuItem>
        </>
      );
    }
    return null;
  };

  // Confirmation dialog handler
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

  return (
    <div className="space-y-4">
      <DataTable
        apiEndpoint="/api/admin/staking/position"
        model="stakingPosition"
        modelConfig={{ poolId }}
        permissions={{
        access: "view.staking.position",
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

      {/* Confirmation Dialog for Approve/Reject Withdrawal */}
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
              {t("the_withdrawal_request_for_this_position")}
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
    </div>
  );
}
