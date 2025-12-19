"use client";
import DataTable from "@/components/blocks/data-table";
import { ArrowLeftRight } from "lucide-react";
import React from "react";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";

export default function FuturesPositionsPage() {
  const t = useTranslations("ext_admin");
  const futuresPositionsColumns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      model="position"
      apiEndpoint="/api/admin/futures/position"
      permissions={{
        access: "access.futures.position",
        view: "view.futures.position",
        create: "create.futures.position",
        edit: "edit.futures.position",
        delete: "delete.futures.position"}}
      columns={futuresPositionsColumns}
      analytics={analytics}
      title={t("futures_positions")}
      description={t("monitor_and_manage_active_futures_trading")}
      itemTitle="Position"
      pageSize={12}
      canView
      isParanoid={false}
      db="scylla"
      keyspace="futures"
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "red",
        icon: ArrowLeftRight}}
    />
  );
}
