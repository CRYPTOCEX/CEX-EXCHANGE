import React from "react";
import { Card } from "@/components/ui/card";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

const StepReview: React.FC = () => {
  const t = useTranslations("ext");
  const { watch } = useFormContext<DeployFormData>();
  const data = watch();

  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold">{t("review_&_submit")}</h2>
      <Card className="p-3 border space-y-2">
        <p>
          <strong>{t("mode")}</strong> {data.mode}
        </p>
        <p>
          <strong>{t("chain")}</strong> {data.chain}
        </p>
        <p>
          <strong>{t("name")}</strong> {data.name}
        </p>
        <p>
          <strong>{t("symbol")}</strong> {data.currency}
        </p>
        <p>
          <strong>{t("decimals")}</strong> {data.decimals}
        </p>
        {data.mode === "deploy" ? (
          <>
            <p>
              <strong>{t("initial_supply")}</strong> {data.initialSupply}
            </p>
            <p>
              <strong>{t("initial_holder")}</strong> {data.initialHolder}
            </p>
            <p>
              <strong>{t("market_cap")}</strong> {data.marketCap}
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>{t("contract_address")}</strong> {data.contract}
            </p>
            <p>
              <strong>{t("contract_type")}</strong> {data.contractType}
            </p>
          </>
        )}
        <p>
          <strong>{t("status")}</strong> {data.status ? "Enabled" : "Disabled"}
        </p>
        <p>
          <strong>{t("precision")}</strong> {data.precision}
        </p>
        <p>
          <strong>{t("limits")}</strong>
          {t("deposit")}
          {data.limits.deposit.min} - {data.limits.deposit.max}
          {t("withdraw")}
          {data.limits.withdraw.min} - {data.limits.withdraw.max}
        </p>
        <p>
          <strong>{t("fee")}</strong>
          min
          {data.fee.min}
          {t("percentage")} {data.fee.percentage}
        </p>
        {data.icon && (
          <p>
            <strong>{t("icon")}</strong>{" "}
            {typeof data.icon === "string" ? data.icon : "New file selected"}
          </p>
        )}
        {data.mode === "import" && (
          <>
            <p>
              <strong>{t("network")}</strong> {data.network}
            </p>
            <p>
              <strong>{t("type")}</strong> {data.type}
            </p>
          </>
        )}
      </Card>
    </Card>
  );
};

export default StepReview;
