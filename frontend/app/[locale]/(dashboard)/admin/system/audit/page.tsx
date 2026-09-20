"use client";

import DataTable from "@/components/blocks/data-table";
import { ScrollText } from "lucide-react";
import { useColumns, useViewConfig } from "./columns";
import { useTranslations } from "next-intl";

/**
 * WHO comes here: a compliance officer, or an operator answering "who did this".
 * WHAT they decide: whether an action was authorised, by whom, and with what
 *   stated reason — and whether a sequence of failures is an incident.
 * WHAT they click to finish: nothing. This page is deliberately READ-ONLY.
 *
 * That last line is the exception that proves R13 rather than a violation of it.
 * An audit trail whose rows can be created, edited or deleted from the panel is
 * not evidence. `canCreate`/`canEdit`/`canDelete` are all false and there is no
 * write endpoint behind it — the table is appended to by the request pipeline
 * (`handler/Routes.ts`) and by nothing else.
 */
export default function AdminAuditPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const columns = useColumns();
  const viewConfig = useViewConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/system/audit"
      model="adminAuditLog"
      permissions={{
        access: "access.admin.audit",
        view: "access.admin.audit",
        create: "access.admin.audit",
        edit: "access.admin.audit",
        delete: "access.admin.audit",
      }}
      pageSize={20}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      // READ, not write. `canView` is the flag that lets a row EXPAND — the
      // forensics an audit entry carries (endpoint, ip, requestId, the stated
      // reason, the error) are all `expandedOnly`, so with it false they were
      // reachable from nowhere at all. It grants no mutation: create/edit/
      // delete stay false above and there is still no write endpoint behind
      // this table.
      canView
      // The model has no `deletedAt` — it is append-only. Leaving this true adds
      // a bin/restore toolbar for a bin that cannot exist.
      isParanoid={false}
      title={tCommon("audit_trail")}
      description={t("every_administrative_action_who_performed_it")}
      itemTitle="Audit Entry"
      columns={columns}
      viewConfig={viewConfig}
      design={{ icon: ScrollText }}
    />
  );
}
