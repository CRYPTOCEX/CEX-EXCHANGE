"use client";
import React from "react";
import { useTranslations } from "next-intl";

export function TokenDetails({
  details,
}: {
  details: icoTokenDetailAttributes | null;
}) {
  const t = useTranslations("ext");
  if (!details) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">{t("token_type")}</p>
          <p className="text-sm text-muted-foreground">{details.tokenType}</p>
        </div>
        <div>
          <p className="text-sm font-medium">{t("total_supply")}</p>
          <p className="text-sm text-muted-foreground">
            {details.totalSupply.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">{t("tokens_for_sale")}</p>
          <p className="text-sm text-muted-foreground">
            {details.tokensForSale.toLocaleString()}
            (
            {details.salePercentage}
            %)
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">{t("Blockchain")}</p>
          <p className="text-sm text-muted-foreground">{details.blockchain}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">{t("project_description")}</p>
        <p className="text-sm text-muted-foreground whitespace-pre-line">
          {details.description}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium">{t("use_of_funds")}</p>
        {Array.isArray(details.useOfFunds) ? (
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {details.useOfFunds.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{details.useOfFunds}</p>
        )}
      </div>

      {details.links && (
        <div>
          <p className="text-sm font-medium">{t("Links")}</p>
          <ul className="list-disc list-inside text-sm">
            {Object.entries(details.links).map(([key, value]) => (
              <li key={key}>
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
