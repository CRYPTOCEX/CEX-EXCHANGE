"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function FuturesMarketPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/futures/market"
      model="futuresMarket"
      permissions={{
        access: "access.futures.market",
        view: "view.futures.market",
        create: "create.futures.market",
        edit: "edit.futures.market",
        delete: "delete.futures.market",
      }}
      pageSize={10}
      canCreate
      createLink="/admin/futures/market/create"
      canEdit
      editLink="/admin/futures/market/[id]"
      canDelete
      canView
      isParanoid={false}
      title="Futures Markets"
      itemTitle="Market"
      columns={columns}
    />
  );
}
