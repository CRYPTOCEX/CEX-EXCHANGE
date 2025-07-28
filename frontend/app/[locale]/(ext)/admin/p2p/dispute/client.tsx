"use client";

import React from "react";
import DataTable from "@/components/blocks/data-table";
import { disputeColumns } from "./columns";
import { disputeAnalytics } from "./analytics";

export default function AdminDisputesClient() {
  return (
    <DataTable
      apiEndpoint="/api/admin/p2p/dispute"
      model="p2pDispute"
      permissions={{
        access: "access.p2p.dispute",
        view: "view.p2p.dispute",
        create: "create.p2p.dispute",
        edit: "edit.p2p.dispute",
        delete: "delete.p2p.dispute",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      viewLink="/admin/p2p/dispute/[id]"
      title="P2P Disputes"
      itemTitle="Dispute"
      columns={disputeColumns}
      analytics={disputeAnalytics}
      isParanoid={true}
    />
  );
}
