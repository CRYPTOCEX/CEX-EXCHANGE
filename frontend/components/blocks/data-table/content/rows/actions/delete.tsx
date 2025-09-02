"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTableStore } from "../../../store";
import { useUserStore } from "@/store/user";
import { checkPermission } from "../../../utils/permissions";
import { TooltipWrapper } from "./tooltip-wrapper";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DeleteActionProps {
  row: any;
  onSelect: () => void;
}

export function DeleteAction({ row, onSelect }: DeleteActionProps) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/actions/delete"
  );
  const permissions = useTableStore((state) => state.permissions);
  const user = useUserStore((state) => state.user);
  const handleDelete = useTableStore((state) => state.handleDelete);
  const tableConfig = useTableStore((state) => state.tableConfig);

  const canDelete = permissions?.delete
    ? checkPermission(user, permissions.delete)
    : false;
  const hasDeleteAccess = canDelete && tableConfig.canDelete;

  if (!tableConfig.canDelete) {
    return null;
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasDeleteAccess) {
      onSelect();
      handleDelete(row);
    }
  };

  return (
    <TooltipWrapper
      disabled={!hasDeleteAccess} // true => show tooltip, false => no tooltip
      tooltipContent="You don't have permission to delete items"
    >
      <div>
        <DropdownMenuItem
          onClick={handleDeleteClick}
          disabled={!hasDeleteAccess}
          className={cn(
            "cursor-pointer text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-300",
            !hasDeleteAccess && "cursor-not-allowed opacity-50"
          )}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("Delete")}
        </DropdownMenuItem>
      </div>
    </TooltipWrapper>
  );
}
