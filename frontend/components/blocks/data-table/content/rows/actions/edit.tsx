"use client";

import React from "react";
import { Pencil } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTableStore } from "../../../store";
import { TooltipWrapper } from "./tooltip-wrapper";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { processEndpointLink } from "../../../utils/cell";
import { useTranslations } from "next-intl";

interface EditActionProps {
  row: any;
  onSelect: () => void;
  canEditAction?: boolean;
}

export function EditAction({ row, onSelect, canEditAction }: EditActionProps) {
  const t = useTranslations(
    "components/blocks/data-table/content/rows/actions/edit"
  );
  const handleEdit = useTableStore((state) => state.handleEdit);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const router = useRouter();

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (canEditAction) {
      onSelect();
      if (tableConfig.editLink) {
        const editUrl = processEndpointLink(tableConfig.editLink, row);
        router.push(editUrl);
      } else {
        handleEdit(row);
      }
    }
  };

  const editLinkHref = tableConfig.editLink
    ? processEndpointLink(tableConfig.editLink, row)
    : undefined;

  const EditContent = (
    <DropdownMenuItem
      onClick={handleEditClick}
      disabled={!canEditAction}
      className={cn(
        "cursor-pointer text-foreground",
        !canEditAction && "cursor-not-allowed opacity-50"
      )}
    >
      <Pencil className="mr-2 h-4 w-4" />
      {t("Edit")}
    </DropdownMenuItem>
  );

  return (
    <TooltipWrapper
      disabled={!canEditAction}
      tooltipContent="You don't have permission to edit items"
    >
      <div>
        {editLinkHref ? (
          <Link href={editLinkHref} passHref>
            {EditContent}
          </Link>
        ) : (
          EditContent
        )}
      </div>
    </TooltipWrapper>
  );
}
