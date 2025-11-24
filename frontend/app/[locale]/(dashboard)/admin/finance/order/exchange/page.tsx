"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { exchangeOrderAnalytics } from "./analytics";
export default function ExchangeOrderPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/finance/order/exchange"
      model="exchangeOrder"
      permissions={{
        access: "access.exchange.order",
        view: "view.exchange.order",
        create: "create.exchange.order",
        edit: "edit.exchange.order",
        delete: "delete.exchange.order",
      }}
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      title="Exchange Orders Management"
      itemTitle="Exchange Order"
      columns={columns}
      analytics={exchangeOrderAnalytics}
    />
  );
}
