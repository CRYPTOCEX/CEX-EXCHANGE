"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";
export default function OfferingsList() {
  return (
    <div className="pt-8 pb-20 container">
      <DataTable
        apiEndpoint="/api/admin/ico/offer"
        model="icoTokenOffering"
        permissions={{
          access: "access.ico.offer",
          view: "view.ico.offer",
          create: "create.ico.offer",
          edit: "edit.ico.offer",
          delete: "delete.ico.offer",
        }}
        pageSize={10}
        canCreate={true}
        createLink="/admin/ico/offer/create"
        canEdit={false}
        canDelete={true}
        canView={true}
        viewLink="/admin/ico/offer/[id]"
        isParanoid={true}
        title="Manage Offerings"
        itemTitle="ICO Token Offering"
        description="Review, approve, and manage token offerings"
        columns={columns}
        analytics={analytics}
      />
    </div>
  );
}
