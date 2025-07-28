"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "../../columns";
import { analytics } from "../../analytics";
import { useParams } from "next/navigation";
export default function OfferingsList() {
  const { status } = useParams() as { status: string };
  const capitalizedStatus = status?.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className="pt-8 pb-20 container">
      <DataTable
        apiEndpoint="/api/admin/ico/offer"
        model="icoTokenOffering"
        modelConfig={{ status: capitalizedStatus }}
        permissions={{
        access: "view.ico.offer",
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
        isParanoid={true}
        title={`${capitalizedStatus} Token Offers`}
        itemTitle="ICO Token Offering"
        description="Review, approve, and manage token offerings"
        columns={columns}
        analytics={analytics}
      />
    </div>
  );
}
