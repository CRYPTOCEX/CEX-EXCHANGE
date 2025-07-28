"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
export default function FiatCurrencyPage() {
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
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      isParanoid={false}
      title="Fiat Currency Management"
      itemTitle="Currency"
      columns={columns}
    />
  );
}
