import React from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface FilterButtonProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

export function FilterButton({
  showFilters,
  setShowFilters,
}: FilterButtonProps) {
  const t = useTranslations(
    "components/blocks/data-table/toolbar/filter-button"
  );
  return (
    <motion.div whileTap={{ scale: 0.95 }}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className={showFilters ? "bg-accent" : ""}
      >
        <Filter className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
        {t("Filter")}
      </Button>
    </motion.div>
  );
}
