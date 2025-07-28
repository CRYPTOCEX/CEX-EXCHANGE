"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { aiInvestmentAnalytics } from "./analytics";
export default function AiInvestmentLogPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/investment/log"
      model="aiInvestment"
      permissions={{
        access: "access.ai.investment",
        view: "view.ai.investment",
        create: "create.ai.investment",
        edit: "edit.ai.investment",
        delete: "delete.ai.investment",
      }}
      pageSize={10}
      canEdit
      editCondition={(row) => row.status === "ACTIVE"}
      canDelete
      canView
      isParanoid={false}
      title="AI Investment Logs"
      itemTitle="AI Investment"
      columns={columns}
      analytics={aiInvestmentAnalytics}
    />
  );
}
