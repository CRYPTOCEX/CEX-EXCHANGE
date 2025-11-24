"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function ForexDurationPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/forex/duration"
      model="forexDuration"
      permissions={{
        access: "access.forex.duration",
        view: "view.forex.duration",
        create: "create.forex.duration",
        edit: "edit.forex.duration",
        delete: "delete.forex.duration",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      title="Forex Durations"
      itemTitle="Duration"
      columns={columns}
    />
  );
}
