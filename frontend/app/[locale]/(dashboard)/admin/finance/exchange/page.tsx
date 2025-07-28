"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function ExchangeProviderPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/exchange/provider"
      model="exchange"
      permissions={{
        access: "access.exchange",
        view: "view.exchange",
        create: "create.exchange",
        edit: "edit.exchange",
        delete: "delete.exchange",
      }}
      pageSize={10}
      canView={true}
      viewLink="/admin/finance/exchange/[productId]"
      isParanoid={false}
      title="Exchange Management"
      itemTitle="Exchange"
      columns={columns}
    />
  );
}
