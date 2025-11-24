"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function ForexSignalPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/signal"
      model="forexSignal"
      permissions={{
        access: "access.forex.signal",
        view: "view.forex.signal",
        create: "create.forex.signal",
        edit: "edit.forex.signal",
        delete: "delete.forex.signal",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Forex Signals"
      itemTitle="Signal"
      columns={columns}
    />
  );
}
