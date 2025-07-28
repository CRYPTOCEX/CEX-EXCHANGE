import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/react";

interface MegaMenuTabsProps {
  megaMenu: any[];
}

export default function MegaMenuTabs({ megaMenu }: MegaMenuTabsProps) {
  return (
    <TabsList className="bg-transparent p-0 border-b border-border py-2 px-8 rounded-none w-full justify-start gap-8 relative h-auto">
      {megaMenu.map((tab: any, tIndex: number) => {
        const tabValue = tab.key || tab.title || `tab-${tIndex}`;
        return (
          <TabsTrigger
            key={tabValue}
            value={tabValue}
            className="capitalize data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all duration-200 relative px-0 py-2 h-auto bg-transparent border-0 after:absolute after:left-0 after:right-0 after:-bottom-2 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-primary after:transition-all after:duration-200"
          >
            {tab.icon && <Icon icon={tab.icon} className="h-5 w-5 mr-2" />}
            <span className="text-sm font-medium">{tab.title}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
