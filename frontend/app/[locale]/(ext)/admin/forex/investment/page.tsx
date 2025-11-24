"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { forexInvestmentAnalytics } from "./analytics";
export default function ForexInvestmentPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/investment"
      model="forexInvestment"
      permissions={{
        access: "access.forex.investment",
        view: "view.forex.investment",
        create: "create.forex.investment",
        edit: "edit.forex.investment",
        delete: "delete.forex.investment",
      }}
      pageSize={10}
      canEdit
      canDelete
      canView
      title="Forex Investments"
      itemTitle="Investment"
      columns={columns}
      analytics={forexInvestmentAnalytics}
    />
  );
}
