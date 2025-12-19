// PoolsManagement.tsx
"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { analytics } from "./analytics";
import { Layers } from "lucide-react";

import { useTranslations } from "next-intl";

export default function PoolsManagement() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
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
      pageSize={12}
      canCreate={true}
      createLink="/admin/staking/pool/new"
      canEdit={true}
      editLink="/admin/staking/pool/[id]/edit"
      canDelete={true}
      canView={true}
      viewLink="/admin/staking/pool/[id]"
      isParanoid={true}
      title={t("staking_pool_management")}
      itemTitle="Staking Pool"
      description={t("manage_staking_pools_configure_rewards_and")}
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: 'violet',
        secondaryColor: 'indigo',
        icon: Layers,
      }}
    />
  );
}
