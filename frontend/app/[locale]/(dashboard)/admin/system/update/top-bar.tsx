"use client";

import React from "react";
import { useSystemUpdateStore } from "@/store/update";
import { useTranslations } from "next-intl";

export function TopBar() {
  const t = useTranslations("dashboard");
  const { productVersion, licenseVerified } = useSystemUpdateStore();

  return (
    <div className="flex justify-between items-center w-full mb-5">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-bold">{t("system_update")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("current_version")}{" "}
          <span className="font-medium text-blue-500">{productVersion}</span>
        </p>
      </div>
      <div className="flex items-center space-x-3">
        <div
          className={`w-4 h-4 rounded-full animate-pulse ${
            licenseVerified ? "bg-green-500" : "bg-red-500"
          }`}
          title={licenseVerified ? "License Verified" : "License Not Verified"}
        />
        <span className="text-sm">
          {licenseVerified ? "License Verified" : "License Not Verified"}
        </span>
      </div>
    </div>
  );
}
