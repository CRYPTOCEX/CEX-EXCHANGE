"use client";
import DataTable from "@/components/blocks/data-table";
import { TrendingUp } from "lucide-react";
import { useColumns} from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function ExchangeOrderPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/order/exchange"
      model="exchangeOrder"
      permissions={{
        access: "access.exchange.order",
        view: "view.exchange.order",
        create: "create.exchange.order",
        edit: "edit.exchange.order",
        delete: "delete.exchange.order"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      title={t("exchange_orders_management")}
      description={t("view_and_manage_exchange_trading_orders")}
      itemTitle="Exchange Order"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: TrendingUp}}
    />
  );
}
