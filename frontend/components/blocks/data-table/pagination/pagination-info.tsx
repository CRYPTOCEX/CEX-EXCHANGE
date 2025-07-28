import React from "react";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";

export function PaginationInfo() {
  const t = useTranslations(
    "components/blocks/data-table/pagination/pagination-info"
  );
  const page = useTableStore((state) => state.page);
  const totalPages = useTableStore((state) => state.totalPages);

  return (
    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
      {t("Page")} {page} {t("of")} {totalPages}
    </div>
  );
}
