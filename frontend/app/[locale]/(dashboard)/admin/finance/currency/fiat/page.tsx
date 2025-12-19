"use client";
import DataTable from "@/components/blocks/data-table";
import { Coins } from "lucide-react";
import { useColumns } from "./columns";
import { useTranslations } from "next-intl";
export default function FiatCurrencyPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/currency/fiat"
      model="currency"
      permissions={{
        access: "access.fiat.currency",
        view: "view.fiat.currency",
        create: "create.fiat.currency",
        edit: "edit.fiat.currency",
        delete: "delete.fiat.currency",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title={t("fiat_currency_management")}
      description={t("manage_fiat_currencies_and_exchange_rates")}
      itemTitle="Currency"
      columns={columns}
      design={{
        animation: "orbs",
        icon: Coins,
      }}
    />
  );
}
