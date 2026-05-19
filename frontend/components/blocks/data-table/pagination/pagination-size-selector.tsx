import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";

export function PaginationSizeSelector() {
  const tExtAffiliate = useTranslations("ext_affiliate");
  const pageSize = useTableStore((state) => state.pageSize);
  const setPageSize = useTableStore((state) => state.setPageSize);
  const paginationLoading = useTableStore((state) => state.paginationLoading);
  const getPageSizeOptions = useTableStore((state) => state.getPageSizeOptions);
  const pageSizeOptions = getPageSizeOptions();

  return (
    <div className="flex items-center space-x-2">
      <p className="text-sm font-medium whitespace-nowrap">{tExtAffiliate("items_per_page_1")}</p>
      <Select
        value={`${pageSize}`}
        onValueChange={(value) => setPageSize(Number(value), true)}
        disabled={paginationLoading}
      >
        <SelectTrigger className="h-8 w-[70px]">
          <SelectValue placeholder={pageSize} />
        </SelectTrigger>
        <SelectContent side="top">
          {pageSizeOptions.map((size) => (
            <SelectItem key={size} value={`${size}`}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
