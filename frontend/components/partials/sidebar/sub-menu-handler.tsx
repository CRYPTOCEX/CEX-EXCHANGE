"use client";
import { Icon } from "@/components/ui/icon";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { useMenuTranslations } from "@/components/partials/menu-translator";

const SubMenuHandler = ({
  item,
  toggleSubmenu,
  index,
  activeSubmenu,
  collapsed,
  hovered,
  isActive,
}: {
  item: any;
  toggleSubmenu: any;
  index: number;
  activeSubmenu: number | null;
  collapsed: boolean;
  hovered: boolean;
  isActive: boolean;
}) => {
  const { icon } = item;
  const { getTitle } = useMenuTranslations();
  const title = getTitle(item);

  return (
    <>
      {!collapsed || hovered ? (
        <div
          onClick={() => toggleSubmenu(index)}
          className={cn(
            "flex text-foreground group font-medium text-sm capitalize px-[10px] py-3 rounded cursor-pointer transition-all duration-100 hover:bg-primary hover:text-primary-foreground",
            {
              "bg-primary text-primary-foreground":
                activeSubmenu === index || isActive,
            }
          )}
        >
          <div className="flex-1 gap-3 flex items-start">
            <span className="inline-flex items-center">
              {/* `fallback` covers BOTH the no-icon case the ternary used to
                  handle and a stored name the local table cannot resolve —
                  which previously drew nothing at all. */}
              <Icon icon={icon} className="w-5 h-5" fallback={Folder} />
            </span>
            <div>{title}</div>
          </div>
          <div className="flex-0">
            <div
              className={cn(
                /* `dark:group-hover:text-black` deleted (R5): `--primary-foreground`
                   is already near-black in the dark theme, so the fork was both
                   a banned dark: colour variant and redundant. */
                "text-base rounded-full flex justify-center items-center transition-all duration-300 group-hover:text-primary-foreground",
                {
                  "rotate-90": activeSubmenu === index,
                  "text-muted-foreground": activeSubmenu !== index,
                }
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "inline-flex cursor-pointer items-center justify-center w-12 h-12 rounded-md",
            {
              "bg-primary text-primary-foreground":
                activeSubmenu === index || isActive,
            }
          )}
        >
          <Icon icon={icon} className="w-6 h-6" fallback={Folder} />
        </div>
      )}
    </>
  );
};

export default SubMenuHandler;
