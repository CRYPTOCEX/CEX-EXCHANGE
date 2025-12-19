"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcosystemLedgerPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/ecosystem/ledger"
      model="ecosystemPrivateLedger"
      permissions={{
        access: "access.ecosystem.private.ledger",
        view: "view.ecosystem.private.ledger",
        create: "create.ecosystem.private.ledger",
        edit: "edit.ecosystem.private.ledger",
        delete: "delete.ecosystem.private.ledger",
      }}
      pageSize={12}
      canCreate={false}
      canEdit
      canDelete
      canView
      title="Ledgers"
      description={t("view_blockchain_transaction_ledgers")}
      itemTitle="Ledger Entry"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "cyan",
        icon: BookOpen,
      }}
    />
  );
}
