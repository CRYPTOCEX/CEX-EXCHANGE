"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function AiInvestmentPlanPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ai/investment/plan"
      model="aiInvestmentPlan"
      permissions={{
        access: "access.ai.investment.plan",
        view: "view.ai.investment.plan",
        create: "create.ai.investment.plan",
        edit: "edit.ai.investment.plan",
        delete: "delete.ai.investment.plan",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="AI Investment Plans"
      itemTitle="AI Plan"
      columns={columns}
    />
  );
}
