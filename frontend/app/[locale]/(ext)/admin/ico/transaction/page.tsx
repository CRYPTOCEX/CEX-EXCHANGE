"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";
export default function InvestorsList() {
  return (
    <DataTable
      apiEndpoint={`/api/admin/ico/transaction`}
      userAnalytics={true}
      model="icoTransaction"
      permissions={{
        access: "access.ico.transaction",
        view: "view.ico.transaction",
        create: "create.ico.transaction",
        edit: "edit.ico.transaction",
        delete: "delete.ico.transaction",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/ico/transaction/[id]"
      isParanoid={true}
      title="Manage Transactions"
      itemTitle="ICO Transaction"
      description="Review, approve, and manage transactions"
      columns={columns}
      analytics={analytics}
    />
  );
}
