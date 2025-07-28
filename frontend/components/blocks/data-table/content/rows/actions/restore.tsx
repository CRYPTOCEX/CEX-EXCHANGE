"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTableStore } from "../../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../../utils/permissions";
import { TooltipWrapper } from "./tooltip-wrapper";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface RestoreActionProps {
  row: any;
  onSelect: () => void;
}

export function RestoreAction({ row, onSelect }: RestoreActionProps) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/actions/restore"
  );
  const permissions = useTableStore((state) => state.permissions);
  const user = useUserStore((state) => state.user);
  const handleRestore = useTableStore((state) => state.handleRestore);
  const tableConfig = useTableStore((state) => state.tableConfig);

  const canDelete = permissions?.delete
    ? checkPermission(user, permissions.delete)
    : false;
  const hasDeleteAccess = canDelete && tableConfig.canDelete;

  if (!tableConfig.canDelete) {
    return null;
  }

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasDeleteAccess) {
      onSelect();
      handleRestore(row);
    }
  };

  return (
    <TooltipWrapper
      disabled={!hasDeleteAccess}
      tooltipContent="You don't have permission to restore items"
    >
      <div>
        <DropdownMenuItem
          onClick={handleRestoreClick}
          disabled={!hasDeleteAccess}
          className={cn(
            "cursor-pointer text-foreground",
            !hasDeleteAccess && "cursor-not-allowed opacity-50"
          )}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("Restore")}
        </DropdownMenuItem>
      </div>
    </TooltipWrapper>
  );
}
