"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export default function TransactionPage() {
  const t = useTranslations("common");
  const { user } = useUserStore();
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/finance/transaction"
      model="transaction"
      modelConfig={{
        userId: user?.id,
      }}
      userAnalytics={true}
      pageSize={12}
      canView={true}
      isParanoid={false}
      title={t("transactions_history")}
      itemTitle="Transaction"
      columns={columns}
      analytics={analytics}
    />
  );
}
