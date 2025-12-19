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
import { motion, AnimatePresence } from "framer-motion";

// Premium button styles
const premiumButtonClass = cn(
  "h-9 px-3",
  "rounded-lg",
  "bg-gradient-to-br from-background via-background to-muted/30",
  "border border-border/50",
  "shadow-sm shadow-black/5",
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
  const permissions = useTableStore((state) => state.permissions);

  const selectedRowsCount = selectedRows.length;

  if (selectedRowsCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn(
          "flex items-center gap-2 px-3 py-[4px]",
          "rounded-lg",
          "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5",
          "border border-primary/20",
          "ltr:flex-row rtl:flex-row-reverse"
        )}
      >
        <span
          className={cn(
            "text-sm font-medium",
            "px-2 py-0.5 rounded-md",
            "bg-primary/10 text-primary"
          )}
        >
          {selectedRowsCount} {tCommon("selected")}
        </span>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={deselectAllRows}
            className={cn(premiumButtonClass, "h-8 px-2.5")}
          >
            {tCommon("clear")}
          </Button>
        </motion.div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
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
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              "ltr:text-left rtl:text-right",
              "bg-gradient-to-br from-popover via-popover to-popover/95",
              "backdrop-blur-xl",
              "border border-border/50",
              "shadow-xl shadow-black/10"
            )}
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
      </motion.div>
    </AnimatePresence>
  );
}
