"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function InvestmentDurationPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/investment/duration"
      model="investmentDuration"
      permissions={{
        access: "access.investment.duration",
        view: "view.investment.duration",
        create: "create.investment.duration",
        edit: "edit.investment.duration",
        delete: "delete.investment.duration",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Investment Duration Management"
      itemTitle="Investment Duration"
      columns={columns}
    />
  );
}
