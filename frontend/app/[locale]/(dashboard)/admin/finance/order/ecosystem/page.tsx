"use client";
import DataTable from "@/components/blocks/data-table";
import React from "react";
import { ecosystemOrderColumns } from "./columns";
import { ecosystemOrderAnalytics } from "./analytics";
export default function EcosystemOrdersPage() {
  return (
    <DataTable
      model="orders"
      apiEndpoint="/api/admin/ecosystem/order"
      permissions={{
        access: "access.ecosystem.order",
        view: "view.ecosystem.order",
        create: "create.ecosystem.order",
        edit: "edit.ecosystem.order",
        delete: "delete.ecosystem.order",
      }}
      columns={ecosystemOrderColumns}
      analytics={ecosystemOrderAnalytics}
      title="Ecosystem Orders"
      itemTitle="Order"
      pageSize={10}
      canView
      isParanoid={false}
      db="scylla"
      keyspace="ecosystem"
    />
  );
}
