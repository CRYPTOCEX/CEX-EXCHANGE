"use client";
import React from "react";
import { useTranslations } from "next-intl";
export function TokenDetails({
  details,
}: {
  details: icoTokenDetailAttributes | null;
}) {
  const t = useTranslations("ext");
  const tExtIco = useTranslations("ext_ico");
  if (!details) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">{t("token_type")}</p>
          <p className="text-sm text-muted-foreground">
            {details.tokenTypeData?.name || details.tokenType}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">{t("total_supply")}</p>
          <p className="text-sm text-muted-foreground">
            {(details.totalSupply ?? 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">{tExtIco("tokens_for_sale")}</p>
          <p className="text-sm text-muted-foreground">
            {(details.tokensForSale ?? 0).toLocaleString()}
            (
            {details.salePercentage}
            %)
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">{t("blockchain")}</p>
          <p className="text-sm text-muted-foreground">{details.blockchain}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">{tExtIco("project_description")}</p>
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
          <p className="text-sm font-medium">{tExtIco("links")}</p>
          <ul className="list-disc list-inside text-sm">
            {Object.entries(details.links).map(([key, value]) => (
              <li key={key}>
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={"text-teal-600 dark:text-teal-400 hover:underline"}
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
