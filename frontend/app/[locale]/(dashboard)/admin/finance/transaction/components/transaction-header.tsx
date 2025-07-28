"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface TransactionHeaderProps {
  title: string;
  backUrl: string;
}

export const TransactionHeader: React.FC<TransactionHeaderProps> = ({
  title,
  backUrl,
}) => {
  const t = useTranslations("dashboard");
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <h1 className="text-2xl font-bold mb-4 sm:mb-0">{title}</h1>
      <Link href={backUrl}>
        <Button variant="soft" className="px-4 py-2">
          <Icon icon="mdi:arrow-left" className="h-4 w-4 mr-2" />
          {t("Back")}
        </Button>
      </Link>
    </div>
  );
};
