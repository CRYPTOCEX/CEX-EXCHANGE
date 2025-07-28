"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";

export default function BinaryDurationPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/binary/duration"
      model="binaryDuration"
      permissions={{
        access: "access.binary.duration",
        view: "view.binary.duration",
        create: "create.binary.duration",
        edit: "edit.binary.duration",
        delete: "delete.binary.duration",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={false}
      title="Binary Durations"
      itemTitle="Duration"
      columns={columns}
    />
  );
}
