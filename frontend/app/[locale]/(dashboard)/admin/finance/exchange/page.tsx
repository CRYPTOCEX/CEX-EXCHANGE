"use client";
import DataTable from "@/components/blocks/data-table";
import { TrendingUp } from "lucide-react";
import { useColumns } from "./columns";
import { useTranslations } from "next-intl";
export default function ExchangeProviderPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/exchange/provider"
      model="exchange"
      permissions={{
        access: "access.exchange",
        view: "view.exchange",
        create: "create.exchange",
        edit: "edit.exchange",
        delete: "delete.exchange"}}
      pageSize={12}
      canView={true}
      viewLink="/admin/finance/exchange/[productId]"
      isParanoid={false}
      title={t("exchange_management")}
      description={t("manage_cryptocurrency_exchanges_and_integrations")}
      itemTitle="Exchange"
      columns={columns}
      design={{
        animation: "orbs",
        icon: TrendingUp}}
    />
  );
}
