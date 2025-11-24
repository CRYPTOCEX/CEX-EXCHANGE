import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import MegaMenuPanel from "./panel";

interface MegaMenuContentProps {
  category: any;
  tabValue: string;
  hoveredExtension: any;
  setHoveredExtension: React.Dispatch<React.SetStateAction<any>>;
}

export default function MegaMenuContent({
  category,
  tabValue,
  hoveredExtension,
  setHoveredExtension,
}: MegaMenuContentProps) {
  const categoryHasChildren = category?.child && Array.isArray(category.child) && category.child.length > 0;

  // Compute first and last indexing for styling if needed
  // This logic was previously done inside. You can keep it here or inside the panel
  const index = hoveredExtension && category?.child && Array.isArray(category.child)
    ? category.child.indexOf(hoveredExtension)
    : -1;
  const isFirst = index === 0;
  const isLast = category?.child && Array.isArray(category.child) ? index === category.child.length - 1 : false;

  return (
    <TabsContent
      value={tabValue}
      onMouseLeave={() => setHoveredExtension(null)}
      className="hidden data-[state=active]:flex items-stretch"
    >
      <MegaMenuPanel
        category={category}
        hoveredExtension={hoveredExtension}
        setHoveredExtension={setHoveredExtension}
        isFirst={isFirst}
        isLast={isLast}
      />
    </TabsContent>
  );
}
