"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function InvestmentPlanPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/investment/plan"
      model="investmentPlan"
      permissions={{
        access: "access.investment.plan",
        view: "view.investment.plan",
        create: "create.investment.plan",
        edit: "edit.investment.plan",
        delete: "delete.investment.plan",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Investment Plan Management"
      itemTitle="Investment Plan"
      columns={columns}
    />
  );
}
