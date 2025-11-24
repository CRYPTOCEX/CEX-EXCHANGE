"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";
export default function ApiKeyPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/api"
      model="apiKey"
      permissions={{
        access: "access.api.key",
        view: "view.api.key",
        create: "create.api.key",
        edit: "edit.api.key",
        delete: "delete.api.key",
      }}
      pageSize={10}
      canCreate={true}
      canEdit={true}
      canDelete={true}
      canView={true}
      isParanoid={true}
      title="API Key Management"
      itemTitle="API Key"
      columns={columns}
      analytics={analytics}
    />
  );
}
