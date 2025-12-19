"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcosystemCustodialWalletPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/wallet/custodial"
      model="ecosystemCustodialWallet"
      permissions={{
        access: "access.ecosystem.custodial.wallet",
        view: "view.ecosystem.custodial.wallet",
        create: "create.ecosystem.custodial.wallet",
        edit: "edit.ecosystem.custodial.wallet",
        delete: "delete.ecosystem.custodial.wallet",
      }}
      pageSize={12}
      canCreate
      canEdit
      canDelete
      canView
      title={t("custodial_wallet_management")}
      description={t("manage_and_monitor_user_custodial_wallets")}
      itemTitle="Custodial Wallet"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "cyan",
        icon: ShieldCheck,
      }}
    />
  );
}
