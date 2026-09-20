"use client";
import DataTable from "@/components/blocks/data-table";
import {
  QueueDecisionActions,
  queueDecisionBulkActions,
  type QueueDecisionConfig,
} from "@/components/blocks/data-table/actions/queue-decision-actions";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "../transaction/analytics";
import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";

const DECISION: QueueDecisionConfig = {
  endpoint: "/api/admin/finance/transfer/status",
  approveStatus: "COMPLETED",
  rejectStatus: "REJECTED",
  approveLabel: "Approve",
  rejectLabel: "Reject",
  // The settlement handler itself only accepts PENDING, so offering the buttons
  // on anything else would produce a guaranteed 400.
  actionableStatuses: ["PENDING"],
};

export default function TransferLogPage() {
  const t = useTranslations("dashboard_admin");
  const analytics = useAnalytics();
  const columns = useColumns();
  const viewConfig = useViewConfig();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/transfer"
      model="transaction"
      modelConfig={{
        // Must match the backend filter in
        // api/admin/finance/transfer/index.get.ts — see the note there. The
        // OUTGOING row is the one that exists while a transfer is PENDING.
        type: "OUTGOING_TRANSFER",
      }}
      permissions={{
        access: "access.transfer",
        view: "view.transfer",
        create: "create.transfer",
        edit: "edit.transfer",
        delete: "delete.transfer",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={true}
      editLink="/admin/finance/transfer/[id]"
      viewLink="/admin/finance/transfer/[id]"
      editCondition={(item) => ["PENDING", "PROCESSING"].includes(item.status)}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title={t("transfer_log_management")}
      itemTitle="Transfer"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      // Queue contract point 1 — the settlement engine used to be reachable
      // only by hand-typed URL, and even once it was linked the list opened on
      // every transfer ever made, newest first.
      initialSort={[{ id: "createdAt", desc: false }]}
      initialFilters={{ status: "PENDING" }}
      extraRowActions={(row) => (
        <QueueDecisionActions row={row} config={DECISION} />
      )}
      bulkActions={queueDecisionBulkActions(DECISION)}
      design={{
        icon: TrendingUp,
      }}
    />
  );
}
