"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { m } from "framer-motion";
import { FinanceShell, PageHeader } from "../_components/finance-ui";

export default function TransactionPage() {
  const t = useTranslations("common");
  const { user } = useUserStore();
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  return (
    <FinanceShell>
      <PageHeader
        icon={History}
        eyebrow="Finance"
        title={t("transactions_history")}
        description={t("every_deposit_withdrawal_transfer_and_on")}
      />
      <m.div
        data-tour="history-type"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
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
          /* `PageHeader` above already drew this exact string as the page's
             `<h1>`, so the table's own copy was a SECOND one: the browser read
             back ["Transactions History", "Transactions History"] and a screen
             reader announced the page title twice. The text and the type scale
             are unchanged — only the level. */
          titleAs="h2"
          itemTitle="Transaction"
          columns={columns}
          viewConfig={viewConfig}
          analytics={analytics}
        />
      </m.div>
    </FinanceShell>
  );
}
