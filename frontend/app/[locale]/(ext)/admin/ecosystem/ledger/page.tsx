"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function EcosystemLedgerPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/ledger"
      model="ecosystemPrivateLedger"
      permissions={{
        access: "access.ecosystem.private.ledger",
        view: "view.ecosystem.private.ledger",
        create: "create.ecosystem.private.ledger",
        edit: "edit.ecosystem.private.ledger",
        delete: "delete.ecosystem.private.ledger",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Ecosystem Ledger"
      itemTitle="Ledger Entry"
      columns={columns}
    />
  );
}
