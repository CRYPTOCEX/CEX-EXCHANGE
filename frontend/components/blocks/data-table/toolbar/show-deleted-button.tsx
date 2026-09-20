import React from "react";
import { Button } from "@/components/ui/button";
import { EyeOff, Eye, Loader2 } from "lucide-react";
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
  "h-10 px-3",
  "rounded-lg",
  "bg-background",
  "border border-border/50",
  "shadow-sm shadow-shadow/5",
  "transition-all duration-300",
  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/10",
  "disabled:opacity-40 disabled:hover:shadow-none disabled:hover:border-border/50"
);

// Icon animation variants
const iconVariants = {
  initial: { opacity: 0, scale: 0.8, rotate: -90 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.8, rotate: 90 },
};

export function ShowDeletedButton() {
  const t = useTranslations("components_blocks");
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

  const label = showDeleted ? t("hide_deleted") : t("show_deleted");

  return (
      <Tooltip>
        <TooltipTrigger asChild>
          <m.span
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDeleted}
              className={cn(
                premiumButtonClass,
                showDeleted && "bg-warning/10 border-warning/30 shadow-md shadow-warning/10"
              )}
              disabled={!canToggleDeleted || showDeletedLoading}
            >
              <AnimatePresence mode="wait">
                {showDeletedLoading ? (
                  <m.div
                    key="loading"
                    variants={iconVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2
                      className={cn(
                        "h-4 w-4 animate-spin text-primary",
                        "md:ltr:mr-2 md:rtl:ml-2"
                      )}
                    />
                  </m.div>
                ) : showDeleted ? (
                  <m.div
                    key="eye-off"
                    variants={iconVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                  >
                    <EyeOff className={cn("h-4 w-4 text-warning", "md:ltr:mr-2 md:rtl:ml-2")} />
                  </m.div>
                ) : (
                  <m.div
                    key="eye"
                    variants={iconVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                  >
                    <Eye className={cn("h-4 w-4 text-muted-foreground", "md:ltr:mr-2 md:rtl:ml-2")} />
                  </m.div>
                )}
              </AnimatePresence>
              <span className={cn(
                "hidden md:inline transition-colors duration-200",
                showDeleted ? "text-warning font-medium" : ""
              )}>{label}</span>
            </Button>
          </m.span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{!canToggleDeleted ? t("you_need_both_deleted_items") : label}</p>
        </TooltipContent>
      </Tooltip>
  );
}
