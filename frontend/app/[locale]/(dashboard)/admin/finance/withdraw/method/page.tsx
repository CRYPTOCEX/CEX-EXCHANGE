"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function WithdrawMethodPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/withdraw/method"
      model="withdrawMethod"
      permissions={{
        access: "access.withdraw.method",
        view: "view.withdraw.method",
        create: "create.withdraw.method",
        edit: "edit.withdraw.method",
        delete: "delete.withdraw.method",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Withdraw Methods"
      itemTitle="Withdraw Method"
      columns={columns}
    />
  );
}
