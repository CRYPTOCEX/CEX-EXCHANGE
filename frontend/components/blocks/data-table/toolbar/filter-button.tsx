import React from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FilterButtonProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

// Premium button animation variants
const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.03, y: -1 },
  tap: { scale: 0.97 },
};

// Icon rotation animation for filter toggle
const iconVariants = {
  inactive: { rotate: 0 },
  active: { rotate: 180 },
};

// Premium button styles
const premiumButtonClass = cn(
  "h-10 px-3",
  "rounded-lg",
  "bg-gradient-to-br from-background via-background to-muted/30",
  "border border-border/50",
  "shadow-sm shadow-black/5",
  "transition-all duration-300",
  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/10"
);

export function FilterButton({
  showFilters,
  setShowFilters,
}: FilterButtonProps) {
  const t = useTranslations("common");
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                premiumButtonClass,
                showFilters && "bg-primary/10 border-primary/30 shadow-md shadow-primary/10"
              )}
            >
              <motion.div
                variants={iconVariants}
                animate={showFilters ? "active" : "inactive"}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <Filter className={cn(
                  "h-4 w-4 md:ltr:mr-2 md:rtl:ml-2 transition-colors duration-200",
                  showFilters ? "text-primary" : "text-muted-foreground"
                )} />
              </motion.div>
              <span className={cn(
                "hidden md:inline transition-colors duration-200",
                showFilters ? "text-primary font-medium" : ""
              )}>{t("filter")}</span>
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="md:hidden">
          <p>{t("filter")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
