import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "framer-motion";

// Premium button styles
const premiumButtonClass = cn(
  "h-9 px-3",
  "rounded-lg",
  "bg-background",
  "border border-border/50",
  "shadow-sm shadow-shadow/5",
  "transition-all duration-300",
  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
);

// Container animation
const containerVariants = {
  hidden: { opacity: 0, x: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

export function SelectedItemsActions() {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const selectedRows = useTableStore((state) => state.selectedRows);
  const deselectAllRows = useTableStore((state) => state.deselectAllRows);
  const showDeleted = useTableStore((state) => state.showDeleted);
  const handleBulkDelete = useTableStore((state) => state.handleBulkDelete);
  const handleBulkRestore = useTableStore((state) => state.handleBulkRestore);
  const handleBulkPermanentDelete = useTableStore(
    (state) => state.handleBulkPermanentDelete
  );
  /**
   * The RESOLVED boolean, not `hasDeletePermission`.
   *
   * `hasDeletePermission` is the permission NAME (e.g. "delete.withdraw") — a
   * non-empty string, so every one of these gates was permanently true. Bulk
   * delete, bulk restore and bulk PERMANENT delete were therefore offered to
   * anyone who could open the table, and the "you do not have permission"
   * tooltip below could never render. `hasDeletePermission` is the value
   * permissionsSlice actually computes from the user's role.
   */
  const hasDeletePermission = useTableStore((state) => state.hasDeletePermission);
  const tableConfig = useTableStore((state) => state.tableConfig);
  const fetchData = useTableStore((state) => state.fetchData);

  const selectedRowsCount = selectedRows.length;

  // Custom, page-supplied bulk operations (e.g. enable/disable). Only offered in
  // the live view — the deleted view is dedicated to restore/purge.
  const customBulkActions =
    !showDeleted && tableConfig.bulkActions ? tableConfig.bulkActions : [];

  // Preserve legacy behaviour: tables without custom bulk actions still show the
  // built-in delete/restore. Once a table opts into custom bulk actions, the
  // built-in delete only appears when the table is genuinely delete-capable so
  // read-only tables (e.g. forex instruments) don't expose a broken delete.
  const showBuiltInActions =
    (tableConfig.bulkActions?.length ?? 0) === 0 || Boolean(tableConfig.canDelete);

  const hasActionsMenu = customBulkActions.length > 0 || showBuiltInActions;

  const runCustomAction = (action: (typeof customBulkActions)[number]) => {
    void action.onClick({
      ids: [...selectedRows],
      refresh: fetchData,
      clearSelection: deselectAllRows,
    });
  };

  if (selectedRowsCount === 0) return null;

  return (
    <AnimatePresence>
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          "flex items-center gap-2 px-3 py-[4px]",
          "rounded-lg",
          "bg-linear-to-r from-primary/5 via-primary/10 to-primary/5",
          "border border-primary/20",
          "ltr:flex-row rtl:flex-row-reverse"
        )}
      >
        <span
          className={cn(
            "text-sm font-medium",
            "px-2 py-0.5 rounded-md",
            "bg-primary/10 text-primary-ink"
          )}
        >
          {selectedRowsCount} {tCommon("selected")}
        </span>
        <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={deselectAllRows}
            className={cn(premiumButtonClass, "h-8 px-2.5")}
          >
            {tCommon("clear")}
          </Button>
        </m.div>
        {hasActionsMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <m.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  premiumButtonClass,
                  "h-8 px-2.5",
                  "bg-primary/10 border-primary/30"
                )}
              >
                {tCommon("actions")}{" "}
                <MoreHorizontal
                  className={cn("h-4 w-4", "ltr:ml-2 rtl:mr-2")}
                />
              </Button>
            </m.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              "ltr:text-left rtl:text-right",
              "bg-popover",
              "backdrop-blur-xl",
              "border border-border/50",
              "shadow-xl shadow-shadow/10"
            )}
          >
              {customBulkActions.length > 0 && (
                <>
                  {customBulkActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={() => runCustomAction(action)}
                        className={
                          action.variant === "destructive"
                            ? "text-destructive hover:text-destructive"
                            : ""
                        }
                      >
                        {Icon && <Icon className="mr-2 h-4 w-4" />}
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                  {showBuiltInActions && <DropdownMenuSeparator />}
                </>
              )}
              {!showBuiltInActions ? null : showDeleted ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={
                          hasDeletePermission
                            ? () => handleBulkPermanentDelete(selectedRows)
                            : undefined
                        }
                        className={
                          hasDeletePermission
                            ? ""
                            : "cursor-not-allowed opacity-50"
                        }
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t("permanent_delete_selected")}
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    {!hasDeletePermission && (
                      <TooltipContent>
                        <p>{t("you_dont_have_permission_to_delete_items")}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={
                          hasDeletePermission
                            ? () => handleBulkRestore(selectedRows)
                            : undefined
                        }
                        className={
                          hasDeletePermission
                            ? ""
                            : "cursor-not-allowed opacity-50"
                        }
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t("restore_selected")}
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    {!hasDeletePermission && (
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
                        hasDeletePermission
                          ? () => handleBulkDelete(selectedRows)
                          : undefined
                      }
                      className={
                        hasDeletePermission
                          ? "text-destructive hover:text-destructive"
                          : "cursor-not-allowed opacity-50"
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("delete_selected")}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  {!hasDeletePermission && (
                    <TooltipContent>
                      <p>{t("you_dont_have_permission_to_delete_items")}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </m.div>
    </AnimatePresence>
  );
}
