import React from "react";
import { cn } from "@/lib/utils";

const MenuLabel = ({ item, className }: { item: any; className?: string }) => {
  const { title } = item;
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
