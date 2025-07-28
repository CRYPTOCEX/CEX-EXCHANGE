"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";

export default function InvestorsList({ id }) {
  return (
    <DataTable
      apiEndpoint={`/api/admin/ico/offer/${id}/transaction`}
      userAnalytics={true}
      model="icoTransaction"
      permissions={{
        access: "view.ico.transaction",
        view: "view.ico.transaction",
        create: "create.ico.transaction",
        edit: "edit.ico.transaction",
        delete: "delete.ico.transaction",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      itemTitle="ICO Transaction"
      columns={columns}
      analytics={analytics}
    />
  );
}
