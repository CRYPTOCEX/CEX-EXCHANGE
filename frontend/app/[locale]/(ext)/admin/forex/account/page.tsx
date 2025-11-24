"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { forexAccountAnalytics } from "./analytics";
export default function ForexAccountPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/account"
      model="forexAccount"
      permissions={{
        access: "access.forex.account",
        view: "view.forex.account",
        create: "create.forex.account",
        edit: "edit.forex.account",
        delete: "delete.forex.account",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Forex Accounts"
      itemTitle="Forex Account"
      columns={columns}
      analytics={forexAccountAnalytics}
    />
  );
}
