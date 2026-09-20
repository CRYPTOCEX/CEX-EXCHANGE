"use client";

import DataTable from "@/components/blocks/data-table";
import {
  QueueDecisionActions,
  queueDecisionBulkActions,
  type QueueDecisionConfig,
} from "@/components/blocks/data-table/actions/queue-decision-actions";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";

const DECISION: QueueDecisionConfig = {
  endpoint: "/api/admin/finance/deposit/log/status",
  approveStatus: "COMPLETED",
  rejectStatus: "REJECTED",
  approveLabel: "Approve",
  rejectLabel: "Reject",
  actionableStatuses: ["PENDING"],
};

export default function DepositLogPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/deposit/log"
      model="transaction"
      modelConfig={{
        type: "DEPOSIT",
      }}
      permissions={{
        access: "access.deposit",
        view: "view.deposit",
        create: "create.deposit",
        edit: "edit.deposit",
        delete: "delete.deposit",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/finance/deposit/log/[id]"
      isParanoid={true}
      title={t("deposit_log_management")}
      description={t("view_deposit_transaction_history_and_logs")}
      itemTitle="Deposit"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      // Queue contract point 1 — money waiting to be credited, oldest first.
      initialSort={[{ id: "createdAt", desc: false }]}
      initialFilters={{ status: "PENDING" }}
      extraRowActions={(row) => (
        <QueueDecisionActions row={row} config={DECISION} />
      )}
      bulkActions={queueDecisionBulkActions(DECISION)}
      design={{
        icon: Wallet,
      }}
    />
  );
}
