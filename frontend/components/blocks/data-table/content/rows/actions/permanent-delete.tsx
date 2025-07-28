"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTableStore } from "../../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../../utils/permissions";
import { TooltipWrapper } from "./tooltip-wrapper";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PermanentDeleteActionProps {
  row: any;
  onSelect: () => void;
}

export function PermanentDeleteAction({
  row,
  onSelect,
}: PermanentDeleteActionProps) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/actions/permanent-delete"
  );
  const permissions = useTableStore((state) => state.permissions);
  const user = useUserStore((state) => state.user);
  const handlePermanentDelete = useTableStore(
    (state) => state.handlePermanentDelete
  );
  const tableConfig = useTableStore((state) => state.tableConfig);

  const canDelete = permissions?.delete
    ? checkPermission(user, permissions.delete)
    : false;
  const hasDeleteAccess = canDelete && tableConfig.canDelete;

  if (!tableConfig.canDelete) {
    return null;
  }

  const handlePermanentDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasDeleteAccess) {
      onSelect();
      handlePermanentDelete(row);
    }
  };

  return (
    <TooltipWrapper
      disabled={!hasDeleteAccess}
      tooltipContent="You don't have permission to permanently delete items"
    >
      <div>
        <DropdownMenuItem
          onClick={handlePermanentDeleteClick}
          disabled={!hasDeleteAccess}
          className={cn(
            "cursor-pointer text-destructive",
            !hasDeleteAccess && "cursor-not-allowed opacity-50"
          )}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          {t("permanent_delete")}
        </DropdownMenuItem>
      </div>
    </TooltipWrapper>
  );
}
