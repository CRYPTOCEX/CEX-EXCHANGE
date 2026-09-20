"use client";
import React from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import MultiMenuHandler from "./multi-menu-handler";
import MultiNestedMenu from "./multi-nested-menu";
import SubMenuItem from "./sub-menu-item";
import { cn } from "@/lib/utils";

const NestedSubMenu = ({
  activeSubmenu,
  item,
  index,
  activeMultiMenu,
  toggleMultiMenu,
  isItemActive,
}: {
  activeSubmenu: number | null;
  item: any;
  index: number;
  activeMultiMenu: number | null;
  toggleMultiMenu: (index: number) => void;
  isItemActive: (
    parentIndex: number,
    childIndex?: number,
    grandChildIndex?: number
  ) => boolean;
}) => {
  return (
    <Collapsible open={activeSubmenu === index}>
      <CollapsibleContent className="CollapsibleContent">
        <ul className="sub-menu space-y-4 relative before:absolute before:left-4 before:top-0 before:h-[calc(100%-5px)] before:w-[3px] before:bg-primary/10 before:rounded">
          {item.child?.map((subItem: any, j: number) => {
            const isActiveChild = isItemActive(index, j);
            return (
              <li
                className={cn(
                  "block pl-9 first:pt-4 last:pb-4 relative before:absolute first:before:top-4 before:top-0 before:left-4 before:w-[3px]",
                  {
                    "before:bg-primary first:before:h-[calc(100%-16px)] before:h-full":
                      isActiveChild,
                  }
                )}
                key={`sub_menu_${j}`}
              >
                {subItem?.child ? (
                  <div>
                    <MultiMenuHandler
                      subItem={subItem}
                      subIndex={j}
                      activeMultiMenu={activeMultiMenu}
                      toggleMultiMenu={toggleMultiMenu}
                    />
                    <MultiNestedMenu
                      subItem={subItem}
                      subIndex={j}
                      activeMultiMenu={activeMultiMenu}
                      isItemActive={(grandChildIndex: number) =>
                        isItemActive(index, j, grandChildIndex)
                      }
                    />
                  </div>
                ) : (
                  <SubMenuItem subItem={subItem} isActive={isActiveChild} />
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default NestedSubMenu;
