"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecosystemUtxoAnalytics } from "./analytics";
export default function EcosystemUtxoPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/utxo"
      model="ecosystemUtxo"
      permissions={{
        access: "access.ecosystem.utxo",
        view: "view.ecosystem.utxo",
        create: "create.ecosystem.utxo",
        edit: "edit.ecosystem.utxo",
        delete: "delete.ecosystem.utxo",
      }}
      pageSize={10}
      canView
      isParanoid={false}
      title="Ecosystem UTXOs"
      itemTitle="UTXO"
      columns={columns}
      analytics={ecosystemUtxoAnalytics}
    />
  );
}
