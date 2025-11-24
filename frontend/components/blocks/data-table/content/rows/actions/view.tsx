"use client";

import React from "react";
import { Eye } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTableStore } from "../../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../../utils/permissions";
import { processEndpointLink } from "../../../utils/cell";
import { TooltipWrapper } from "./tooltip-wrapper";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ViewActionProps {
  row: any;
  onSelect: () => void;
}

export function ViewAction({ row, onSelect }: ViewActionProps) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/actions/view"
  );
  const handleView = useTableStore((state) => state.handleView);
  const tableConfig = useTableStore((state) => state.tableConfig);

  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const hasViewAccess =
    !!(tableConfig.viewLink || tableConfig.onViewClick) && hasViewPermission;

  if (!tableConfig.viewLink && !tableConfig.onViewClick) {
    return null;
  }

  const viewLinkHref = tableConfig.viewLink
    ? processEndpointLink(tableConfig.viewLink, row)
    : undefined;

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasViewAccess) {
      onSelect();
      if (tableConfig.viewLink) {
        const viewUrl = processEndpointLink(tableConfig.viewLink, row);
        window.location.href = viewUrl;
      } else if (tableConfig.onViewClick) {
        handleView(row);
      }
    }
  };

  const viewContent = (
    <DropdownMenuItem
      onClick={handleViewClick}
      disabled={!hasViewAccess}
      className={cn(
        "cursor-pointer text-foreground",
        !hasViewAccess && "cursor-not-allowed opacity-50"
      )}
    >
      <Eye className="mr-2 h-4 w-4" />
      {t("View")}
    </DropdownMenuItem>
  );

  return (
    <TooltipWrapper
      disabled={!hasViewAccess}
      tooltipContent="You don't have permission to view items"
    >
      <div>
        {viewLinkHref ? (
          <Link href={viewLinkHref} passHref>
            {viewContent}
          </Link>
        ) : (
          viewContent
        )}
      </div>
    </TooltipWrapper>
  );
}
