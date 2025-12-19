"use client";
import DataTable from "@/components/blocks/data-table";
import { TrendingUp } from "lucide-react";
import { useColumns} from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function BinaryOrderPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/order/binary"
      model="binaryOrder"
      permissions={{
        access: "access.binary.order",
        view: "view.binary.order",
        create: "create.binary.order",
        edit: "edit.binary.order",
        delete: "delete.binary.order"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      title={t("binary_orders_management")}
      description={t("view_and_manage_binary_trading_orders")}
      itemTitle="Binary Order"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: TrendingUp}}
    />
  );
}
