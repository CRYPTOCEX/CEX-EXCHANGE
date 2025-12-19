"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { Vault } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcosystemMasterWalletPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/wallet/master"
      model="ecosystemMasterWallet"
      permissions={{
        access: "access.ecosystem.master.wallet",
        view: "view.ecosystem.master.wallet",
        create: "create.ecosystem.master.wallet",
        edit: "edit.ecosystem.master.wallet",
        delete: "delete.ecosystem.master.wallet",
      }}
      pageSize={12}
      canCreate
      canView
      title={t("master_wallet_management")}
      description={t("configure_and_manage_platform_master_wallets")}
      itemTitle="Master Wallet"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "cyan",
        icon: Vault,
      }}
    />
  );
}
