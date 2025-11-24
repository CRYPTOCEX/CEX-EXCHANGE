"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function ForexPlanPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/plan"
      model="forexPlan"
      permissions={{
        access: "access.forex.plan",
        view: "view.forex.plan",
        create: "create.forex.plan",
        edit: "edit.forex.plan",
        delete: "delete.forex.plan",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Forex Plans"
      itemTitle="Forex Plan"
      columns={columns}
    />
  );
}
