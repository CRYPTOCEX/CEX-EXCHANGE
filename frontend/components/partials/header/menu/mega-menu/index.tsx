import React from "react";
import { Tabs } from "@/components/ui/tabs";
import MegaMenuTabs from "./tabs";
import MegaMenuContent from "./content";

interface MegaMenuProps {
  megaMenu: any[];
}

export default function MegaMenu({ megaMenu }: MegaMenuProps) {
  const [hoveredExtension, setHoveredExtension] = React.useState<any>(null);
  const defaultTabValue = megaMenu[0].key || megaMenu[0].title || "default";

  return (
    <Tabs
      defaultValue={defaultTabValue}
      onValueChange={() => setHoveredExtension(null)}
      className="inline-block p-0 max-w-[calc(100vw-2rem)]"
    >
      <MegaMenuTabs megaMenu={megaMenu} />

      <div className="px-4 pt-2 pb-4 overflow-x-auto">
        {megaMenu.map((category: any, catIndex: number) => {
          const tabValue = category.key || category.title || `tab-${catIndex}`;
          return (
            <MegaMenuContent
              key={tabValue}
              category={category}
              tabValue={tabValue}
              hoveredExtension={hoveredExtension}
              setHoveredExtension={setHoveredExtension}
            />
          );
        })}
      </div>
    </Tabs>
  );
}
