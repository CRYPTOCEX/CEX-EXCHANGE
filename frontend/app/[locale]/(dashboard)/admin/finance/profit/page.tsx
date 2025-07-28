"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { adminProfitAnalytics } from "./analytics";
export default function AdminProfitPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/profit"
      model="adminProfit"
      permissions={{
        access: "access.admin.profit",
        view: "view.admin.profit",
        create: "create.admin.profit",
        edit: "edit.admin.profit",
        delete: "delete.admin.profit",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      isParanoid={false} // Model is non-paranoid
      title="Admin Profit Management"
      itemTitle="Profit"
      columns={columns}
      analytics={adminProfitAnalytics}
    />
  );
}
