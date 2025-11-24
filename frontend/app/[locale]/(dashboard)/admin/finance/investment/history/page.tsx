"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { investmentAnalytics } from "./analytics";
export default function InvestmentHistoryPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/investment/history"
      model="investment"
      permissions={{
        access: "access.investment",
        view: "view.investment",
        create: "create.investment",
        edit: "edit.investment",
        delete: "delete.investment",
      }}
      pageSize={10}
      canCreate={false}
      canEdit
      canDelete
      canView
      title="Investment History"
      itemTitle="Investment"
      columns={columns}
      analytics={investmentAnalytics}
    />
  );
}
