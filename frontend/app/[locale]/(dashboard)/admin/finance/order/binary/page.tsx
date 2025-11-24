"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { binaryOrderAnalytics } from "./analytics";
export default function BinaryOrderPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/order/binary"
      model="binaryOrder"
      permissions={{
        access: "access.binary.order",
        view: "view.binary.order",
        create: "create.binary.order",
        edit: "edit.binary.order",
        delete: "delete.binary.order",
      }}
      pageSize={10}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      title="Binary Orders Management"
      itemTitle="Binary Order"
      columns={columns}
      analytics={binaryOrderAnalytics}
    />
  );
}
