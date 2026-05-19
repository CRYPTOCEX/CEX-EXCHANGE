"use client";
import DataTable from "@/components/blocks/data-table";
import React from "react";
import { TrendingUp } from "lucide-react";
import { useColumns} from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function FuturesOrdersPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/futures/order"
      model="orders"
      permissions={{
        access: "access.futures.order",
        view: "view.futures.order",
        create: "create.futures.order",
        edit: "edit.futures.order",
        delete: "delete.futures.order"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      isParanoid={true}
      db="scylla"
      keyspace="futures"
      title={t("futures_orders")}
      description={t("view_and_manage_futures_trading_orders")}
      itemTitle="Futures Order"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: TrendingUp}}
    />
  );
}
