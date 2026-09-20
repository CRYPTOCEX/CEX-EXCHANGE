"use client";
import React, { useEffect, useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AlertCircle, Coins } from "lucide-react";
import { $fetch } from "@/lib/api";
import { ImportPreviewDialog } from "@/components/blocks/import-preview-dialog";
import { useTableStore } from "@/components/blocks/data-table/store";
import { useTranslations } from "next-intl";

const api = "/api/admin/finance/currency/spot";
export default function SpotCurrencyPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();
  const [loading, setLoading] = useState(false);
  const [missingCurrencies, setMissingCurrencies] = useState<
    { id: string; currency: string }[]
  >([]);
  // Fetch missing currencies from the API
  const fetchMissingCurrencies = async () => {
    setLoading(true);
    const { data, error } = await $fetch({
      url: `${api}/missing`,
      silent: true,
    });
    if (!error && data) {
      setMissingCurrencies(data);
    }
    setLoading(false);
  };
  // The import itself lives in `ImportPreviewDialog`: it is preview-first, so
  // pressing the button reads the exchange and shows what would change rather
  // than writing immediately.
  // Activate missing currencies by updating their status to true
  const activateMissingCurrencies = async () => {
    setLoading(true);
    const { error } = await $fetch({
      url: `${api}/status`,
      method: "PUT",
      body: {
        ids: missingCurrencies.map((currency) => currency.id),
        status: true,
      },
    });
    if (!error) {
      // Refresh table data and clear missing currencies from state
      useTableStore.getState().fetchData();
      setMissingCurrencies([]);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchMissingCurrencies();
  }, []);

  // Alert content for missing currencies
  const missingCurrenciesAlert = missingCurrencies.length > 0 ? (
    <Alert
      color="destructive"
      className="flex flex-col sm:flex-row justify-between items-center"
    >
      <div className="flex items-center gap-2">
        <AlertCircle
          className="h-8 w-8 text-destructive"
        />
        <div>
          <h2 className="text-lg font-medium">
            {t("missing_currencies")}
          </h2>
          <p className="text-sm">
            {t("the_following_currencies_the_system")}{" "}
            {missingCurrencies.map((currency, index) => (
              <span key={currency.id}>
                {currency.currency}
                {index < missingCurrencies.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
      <Button
        type="button"
        color="primary"
        variant="soft"
        onClick={activateMissingCurrencies}
        disabled={loading}
        loading={loading}
        className="mt-2 sm:mt-0"
      >
        {t("activate_missing_currencies")}
      </Button>
    </Alert>
  ) : null;

  return (
    <DataTable
        apiEndpoint={api}
        model="exchangeCurrency"
        permissions={{
          access: "access.spot.currency",
          view: "view.spot.currency",
          create: "create.spot.currency",
          edit: "edit.spot.currency",
          delete: "delete.spot.currency",
        }}
        pageSize={12}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        isParanoid={false}
        canView={true}
        title={t("spot_currencies")}
        description={t("manage_spot_trading_currencies_and_market_pairs")}
        itemTitle="Spot Currency"
        columns={columns}
        design={{
          icon: Coins,
        }}
        alertContent={missingCurrenciesAlert}
        extraTopButtons={(refresh) => (
          <ImportPreviewDialog
            endpoint={`${api}/import`}
            label={t("import_currencies")}
            noun="currency"
            onImported={() => {
              useTableStore.getState().fetchData();
              refresh?.();
            }}
          />
        )}
      />
  );
}
