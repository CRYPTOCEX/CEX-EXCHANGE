import React from "react";
import { Button } from "@/components/ui/button";
import { EyeOff, Eye, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";

export function ShowDeletedButton() {
  const t = useTranslations(
    "components/blocks/data-table/toolbar/show-deleted-button"
  );
  const isParanoid = useTableStore((state) => state.tableConfig.isParanoid);

  const showDeleted = useTableStore((state) => state.showDeleted);
  const setShowDeleted = useTableStore((state) => state.setShowDeleted);
  const hasViewPermission = useTableStore((state) => state.hasViewPermission);
  const hasDeletePermission = useTableStore(
    (state) => state.hasDeletePermission
  );
  const showDeletedLoading = useTableStore((state) => state.showDeletedLoading);

  // Show deleted is only enabled if user has both view and delete permissions
  const canToggleDeleted = hasViewPermission && hasDeletePermission;

  const handleToggleDeleted = () => {
    if (showDeletedLoading) return;
    setShowDeleted(!showDeleted);
  };

  if (!isParanoid) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleDeleted}
              className={showDeleted ? "bg-accent" : ""}
              disabled={!canToggleDeleted || showDeletedLoading}
            >
              {showDeletedLoading ? (
                <Loader2
                  className={cn(
                    "mr-2 h-4 w-4 animate-spin",
                    "ltr:mr-2 rtl:ml-2"
                  )}
                />
              ) : showDeleted ? (
                <EyeOff className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
              ) : (
                <Eye className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
              )}
              {showDeleted ? "Hide Deleted" : "Show Deleted"}
            </Button>
          </span>
        </TooltipTrigger>
        {!canToggleDeleted && (
          <TooltipContent>
            <p>{t("you_need_both_deleted_items")}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
