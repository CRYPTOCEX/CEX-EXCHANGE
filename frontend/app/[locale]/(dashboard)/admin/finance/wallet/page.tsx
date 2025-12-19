"use client";
import DataTable from "@/components/blocks/data-table";
import { Wallet } from "lucide-react";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function WalletPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/finance/wallet"
      model="wallet"
      permissions={{
        access: "access.wallet",
        view: "view.wallet",
        create: "create.wallet",
        edit: "edit.wallet",
        delete: "delete.wallet"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title={t("wallet_management")}
      description={t("manage_user_wallets_and_balances")}
      itemTitle="Wallet"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        icon: Wallet}}
    />
  );
}
