"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { transactionAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";

export default function TransactionPage() {
  const { user } = useUserStore();
  return (
    <DataTable
      apiEndpoint="/api/finance/transaction"
      model="transaction"
      modelConfig={{
        userId: user?.id,
      }}
      userAnalytics={true}
      pageSize={10}
      canView={true}
      isParanoid={false}
      title="Transactions History"
      itemTitle="Transaction"
      columns={columns}
      analytics={transactionAnalytics}
    />
  );
}
