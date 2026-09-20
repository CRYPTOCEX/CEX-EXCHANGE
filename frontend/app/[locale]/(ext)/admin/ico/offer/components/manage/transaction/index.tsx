"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { analytics } from "./analytics";
import { Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

export default function InvestorsList({ id }) {
  const t = useTranslations("ext_admin");
  const columns = useColumns();

  return (
    <DataTable
      apiEndpoint={`/api/admin/ico/offer/${id}/transaction`}
      userAnalytics={true}
      model="icoTransaction"
      permissions={{
        access: "view.ico.transaction",
        view: "view.ico.transaction",
        create: "create.ico.transaction",
        edit: "edit.ico.transaction",
        delete: "delete.ico.transaction",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={true}
      title={t("offer_transactions")}
      itemTitle="ICO Transaction"
      description={t("view_transactions_for_this_specific_token_offering")}
      columns={columns}
      analytics={analytics}
    />
  );
}
