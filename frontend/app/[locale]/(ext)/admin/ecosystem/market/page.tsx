"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { useConfigStore } from "@/store/config";

export default function EcosystemMarketPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/market"
      model="ecosystemMarket"
      permissions={{
        access: "access.ecosystem.market",
        view: "view.ecosystem.market",
        create: "create.ecosystem.market",
        edit: "edit.ecosystem.market",
        delete: "delete.ecosystem.market",
      }}
      pageSize={10}
      canCreate
      createLink="/admin/ecosystem/market/create"
      canEdit
      editLink="/admin/ecosystem/market/[id]"
      canDelete
      canView
      isParanoid={false}
      title="Ecosystem Markets"
      itemTitle="Market"
      columns={columns}
    />
  );
}
