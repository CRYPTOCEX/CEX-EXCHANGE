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
import { TrendingUp } from "lucide-react";

/**
 * The withdrawal queue.
 *
 * Money leaves the building here, so this is the queue that had to reach the
 * §3 contract first — and it was the furthest from it: it opened on an
 * unfiltered `createdAt DESC` list mixing years of settled payouts with today's
 * work, showed no age, hid the destination address behind `expandedOnly`, and
 * offered exactly one bulk verb — Delete.
 */

// Both the row buttons and the bulk menu are built from this, so the two can
// never disagree about which statuses are decidable or where the decision goes.
const DECISION: QueueDecisionConfig = {
  endpoint: "/api/admin/finance/withdraw/log/status",
  approveStatus: "COMPLETED",
  rejectStatus: "REJECTED",
  approveLabel: "Approve",
  rejectLabel: "Reject",
  // PROCESSING is included deliberately: a payout stuck mid-flight is exactly
  // the row an operator needs to resolve, and the old UI accepted PENDING only,
  // which is what left those frozen indefinitely.
  actionableStatuses: ["PENDING", "PROCESSING"],
};

export default function WithdrawLogPage() {
  const t = useTranslations("dashboard_admin");
  const analytics = useAnalytics();
  const columns = useColumns();
  const viewConfig = useViewConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/withdraw/log"
      model="transaction"
      modelConfig={{
        type: "WITHDRAW",
      }}
      permissions={{
        access: "access.withdraw",
        view: "view.withdraw",
        create: "create.withdraw",
        edit: "edit.withdraw",
        delete: "delete.withdraw",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/finance/withdraw/log/[id]"
      isParanoid={true}
      title={t("withdraw_log_management")}
      description={t("view_and_manage_user_withdrawal_requests")}
      itemTitle="Withdrawal"
      columns={columns}
      viewConfig={viewConfig}
      analytics={analytics}
      // Queue contract point 1: opens on what is actionable, OLDEST FIRST. The
      // row that has waited longest is the one to decide next; `createdAt DESC`
      // put it on the last page.
      initialSort={[{ id: "createdAt", desc: false }]}
      initialFilters={{ status: "PENDING" }}
      // Point 3 — decide from the row.
      extraRowActions={(row) => (
        <QueueDecisionActions row={row} config={DECISION} />
      )}
      // Point 4 — decide for a selection, with one shared reason.
      bulkActions={queueDecisionBulkActions(DECISION)}
      design={{
        icon: TrendingUp,
      }}
    />
  );
}
