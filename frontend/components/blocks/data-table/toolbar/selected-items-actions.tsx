import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";

export function SelectedItemsActions() {
  const t = useTranslations(
    "components/blocks/data-table/toolbar/selected-items-actions"
  );
  const selectedRows = useTableStore((state) => state.selectedRows);
  const deselectAllRows = useTableStore((state) => state.deselectAllRows);
  const showDeleted = useTableStore((state) => state.showDeleted);
  const handleBulkDelete = useTableStore((state) => state.handleBulkDelete);
  const handleBulkRestore = useTableStore((state) => state.handleBulkRestore);
  const handleBulkPermanentDelete = useTableStore(
    (state) => state.handleBulkPermanentDelete
  );
  const permissions = useTableStore((state) => state.permissions);

  const selectedRowsCount = selectedRows.length;

  if (selectedRowsCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        "ltr:flex-row rtl:flex-row-reverse"
      )}
    >
      <span className="text-sm text-muted-foreground">
        {selectedRowsCount} {t("Selected")}
      </span>
      <Button variant="outline" size="sm" onClick={deselectAllRows}>
        {t("Clear")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {t("Actions")}{" "}
            <MoreHorizontal
              className={cn("ml-2 h-4 w-4", "ltr:ml-2 rtl:mr-2")}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="ltr:text-left rtl:text-right"
        >
          <TooltipProvider>
            {showDeleted ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={
                        permissions.delete
                          ? () => handleBulkPermanentDelete(selectedRows)
                          : undefined
                      }
                      className={
                        permissions.delete
                          ? ""
                          : "cursor-not-allowed opacity-50"
                      }
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      {t("permanent_delete_selected")}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  {!permissions.delete && (
                    <TooltipContent>
                      <p>{t("you_dont_have_permission_to_delete_items")}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={
                        permissions.delete
                          ? () => handleBulkRestore(selectedRows)
                          : undefined
                      }
                      className={
                        permissions.delete
                          ? ""
                          : "cursor-not-allowed opacity-50"
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("restore_selected")}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  {!permissions.delete && (
                    <TooltipContent>
                      <p>{t("you_dont_have_permission_to_restore_items")}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    onClick={
                      permissions.delete
                        ? () => handleBulkDelete(selectedRows)
                        : undefined
                    }
                    className={
                      permissions.delete 
                        ? "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" 
                        : "cursor-not-allowed opacity-50"
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("delete_selected")}
                  </DropdownMenuItem>
                </TooltipTrigger>
                {!permissions.delete && (
                  <TooltipContent>
                    <p>{t("you_dont_have_permission_to_delete_items")}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </TooltipProvider>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
