"use client";
import DataTable from "@/components/blocks/data-table";
import React from "react";
import { futuresPositionsColumns } from "./columns";
import { futuresPositionsAnalytics } from "./analytics";
export default function FuturesPositionsPage() {
  return (
    <DataTable
      model="position"
      apiEndpoint="/api/admin/futures/position"
      permissions={{
        access: "access.futures.position",
        view: "view.futures.position",
        create: "create.futures.position",
        edit: "edit.futures.position",
        delete: "delete.futures.position",
      }}
      columns={futuresPositionsColumns}
      analytics={futuresPositionsAnalytics}
      title="Futures Positions"
      itemTitle="Position"
      pageSize={10}
      canView
      isParanoid={false}
      db="scylla"
      keyspace="futures"
    />
  );
}
