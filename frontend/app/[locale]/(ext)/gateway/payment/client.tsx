"use client";

import React, { useEffect, useState } from "react";
import { Eye, CreditCard } from "lucide-react";
import { Link } from "@/i18n/routing";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { useColumns, useViewConfig } from "./columns";
import $fetch from "@/lib/api";
import { useMerchantMode } from "../context/merchant-mode";
import { useTranslations } from "next-intl";

export default function MerchantPaymentsClient() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const { mode } = useMerchantMode();
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const columns = useColumns();
  const viewConfig = useViewConfig();

  useEffect(() => {
    checkMerchant();
  }, [mode]);

  const checkMerchant = async () => {
    const { data, error } = await $fetch({
      url: "/api/gateway/merchant",
      silent: true,
    });

    if (error || !data?.merchant) {
      setNeedsRegistration(true);
    }
  };

  /**
   * The merchant check no longer replaces the page.
   *
   * This used to be `if (checkingMerchant) return <GatewayPaymentLoading/>`,
   * which swapped the whole route for `./loading.tsx` — a hero block and a grid
   * of grey bars — while a SEPARATE, one-field request ("does this user have a
   * merchant account?") was in flight. The table's own data was not even being
   * waited on: `DataTable` fetches and renders its own pending state, complete
   * with the real column headers, the toolbar and `pageSize` rows. Withholding
   * it meant the page painted a fake table, then a real one.
   *
   * Rendering the table immediately also starts its fetch a round trip earlier.
   * `needsRegistration` is an OUTCOME of the check, not the check itself, so it
   * still swaps the page when it turns out to be true — that is an empty state,
   * not a loading state, and the two were being conflated.
   */
  if (needsRegistration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("register_as_a_payment_gateway_merchant")}
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">{t("register_as_merchant")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <DataTable
      key={mode}
      apiEndpoint={`/api/gateway/payment?mode=${mode}`}
      model="gatewayPayment"
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      title={tCommon("transaction_history")}
      description={t("view_and_manage_all_your_payment_transactions")}
      itemTitle="Payment"
      columns={columns}
      viewConfig={viewConfig}
      isParanoid={false}
      extraTopButtons={() => (
        <Link href="/gateway/dashboard">
          <Button variant="outline" size="sm">
            {tCommon("back_to_dashboard")}
          </Button>
        </Link>
      )}
      expandedButtons={(row) => (
        <div className="flex gap-2">
          <Link href={`/gateway/payment/${row.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              {tCommon("view_details")}
            </Button>
          </Link>
        </div>
      )}
      design={{
        // indigo-500
        // cyan-500
        badge: "Payment History",
        icon: CreditCard,
        detailsAlignment: "bottom",
      }}
    />
  );
}
