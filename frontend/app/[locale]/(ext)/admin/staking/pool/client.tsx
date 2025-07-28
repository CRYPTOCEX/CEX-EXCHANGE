// PoolsManagement.tsx
"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { analytics } from "./analytics";

export default function PoolsManagement() {
  return (
    <DataTable
      apiEndpoint="/api/admin/staking/pool"
      model="stakingPool"
      permissions={{
        access: "access.staking.pool",
        view: "view.staking.pool",
        create: "create.staking.pool",
        edit: "edit.staking.pool",
        delete: "delete.staking.pool",
      }}
      pageSize={10}
      canCreate={true}
      createLink="/admin/staking/pool/new"
      canEdit={true}
      editLink="/admin/staking/pool/[id]/edit"
      canDelete={true}
      canView={true}
      viewLink="/admin/staking/pool/[id]"
      isParanoid={true}
      title="Manage Staking Pools"
      itemTitle="Staking Pool"
      description="Review and manage your staking pools and their settings"
      columns={columns}
      analytics={analytics}
    />
  );
}
