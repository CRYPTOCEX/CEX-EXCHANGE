"use client";
import DataTable from "@/components/blocks/data-table";
import React from "react";
import { futuresOrderColumns } from "./columns";
import { futuresOrderAnalytics } from "./analytics";
export default function FuturesOrdersPage() {
  return (
    <DataTable
      model="orders"
      apiEndpoint="/api/admin/futures/order"
      permissions={{
        access: "access.futures.order",
        view: "view.futures.order",
        create: "create.futures.order",
        edit: "edit.futures.order",
        delete: "delete.futures.order",
      }}
      columns={futuresOrderColumns}
      analytics={futuresOrderAnalytics}
      title="Futures Orders"
      itemTitle="Futures Order"
      pageSize={10}
      canView
      isParanoid={false}
      db="scylla"
      keyspace="futures"
    />
  );
}
