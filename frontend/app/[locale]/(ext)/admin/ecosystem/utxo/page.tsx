"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns} from "./columns";
import { useAnalytics } from "./analytics";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcosystemUtxoPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/utxo"
      model="ecosystemUtxo"
      permissions={{
        access: "access.ecosystem.utxo",
        view: "view.ecosystem.utxo",
        create: "create.ecosystem.utxo",
        edit: "edit.ecosystem.utxo",
        delete: "delete.ecosystem.utxo"}}
      pageSize={12}
      canView
      isParanoid={false}
      title="UTXO Management"
      description={t("manage_unspent_transaction_outputs")}
      itemTitle="UTXO"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "cyan",
        icon: Coins}}
    />
  );
}
