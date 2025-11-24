"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";

export default function IcoTransactionsPage() {
  return (
    <DataTable
      apiEndpoint="/api/ico/transaction"
      userAnalytics={true}
      model="icoTransaction"
      permissions={{
        access: undefined, // User dashboard - no permission check needed (backend filters by user)
        view: undefined,
        create: undefined,
        edit: undefined,
        delete: undefined,
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      viewLink="/ico/transaction/[id]"
      isParanoid={false}
      itemTitle="ICO Transaction"
      columns={columns}
      analytics={analytics}
    />
  );
}
