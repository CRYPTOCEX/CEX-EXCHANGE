import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface SortingDirectionProps {
  direction: "asc" | "desc";
  onDirectionChange: (direction: "asc" | "desc") => void;
}

export function SortingDirection({
  direction,
  onDirectionChange,
}: SortingDirectionProps) {
  const t = useTranslations(
    "components/blocks/data-table/toolbar/sort/sorting-direction"
  );
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t("Direction")}</h3>
      <div className="flex gap-2">
        <Button
          variant={direction === "asc" ? "soft" : "outline"}
          className="flex-1 gap-2"
          onClick={() => onDirectionChange("asc")}
        >
          <ChevronUp className="h-4 w-4" />
          {t("Ascending")}
        </Button>
        <Button
          variant={direction === "desc" ? "soft" : "outline"}
          className="flex-1 gap-2"
          onClick={() => onDirectionChange("desc")}
        >
          <ChevronDown className="h-4 w-4" />
          {t("Descending")}
        </Button>
      </div>
    </div>
  );
}
