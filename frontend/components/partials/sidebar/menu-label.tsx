import React from "react";
import { cn } from "@/lib/utils";
import { useMenuTranslations } from "@/components/partials/menu-translator";

const MenuLabel = ({ item, className }: { item: any; className?: string }) => {
  const { getTitle } = useMenuTranslations();
  const title = getTitle(item);

  return (
    <div
      className={cn(
        "text-foreground font-semibold uppercase mb-3 text-xs mt-4",
        className
      )}
    >
      {title}
    </div>
  );
};

export default MenuLabel;
