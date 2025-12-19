"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { analytics } from "./analytics";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function InvestorsList() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  return (
    <DataTable
      apiEndpoint={`/api/admin/ico/transaction`}
      userAnalytics={true}
      model="icoTransaction"
      permissions={{
        access: "access.ico.transaction",
        view: "view.ico.transaction",
        create: "create.ico.transaction",
        edit: "edit.ico.transaction",
        delete: "delete.ico.transaction"}}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={true}
      canView={true}
      viewLink="/admin/ico/transaction/[id]"
      isParanoid={true}
      title="ICO Transactions"
      itemTitle="ICO Transaction"
      description={t("track_token_sale_contributions_and_transactions")}
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: 'teal',
        secondaryColor: 'cyan',
        icon: ArrowLeftRight}}
    />
  );
}
