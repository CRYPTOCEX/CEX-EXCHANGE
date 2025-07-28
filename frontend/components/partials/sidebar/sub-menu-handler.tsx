"use client";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import React from "react";

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
  const { title, icon } = item;
  return (
    <>
      {!collapsed || hovered ? (
        <div
          onClick={() => toggleSubmenu(index)}
          className={cn(
            "flex text-foreground group font-medium text-sm capitalize px-[10px] py-3 rounded cursor-pointer transition-all duration-100 hover:bg-primary hover:text-primary-foreground dark:hover:text-black",
            {
              "bg-primary text-primary-foreground dark:bg-primary dark:text-black":
                activeSubmenu === index || isActive,
            }
          )}
        >
          <div className="flex-1 gap-3 flex items-start">
            <span className="inline-flex items-center">
              {icon ? (
                <Icon icon={icon} className="w-5 h-5" />
              ) : (
                <Icon icon="solar:folder-line-duotone" className="w-5 h-5" />
              )}
            </span>
            <div>{title}</div>
          </div>
          <div className="flex-0">
            <div
              className={cn(
                "text-base rounded-full flex justify-center items-center transition-all duration-300 group-hover:text-primary-foreground dark:group-hover:text-black",
                {
                  "rotate-90": activeSubmenu === index,
                  "text-muted-foreground": activeSubmenu !== index,
                }
              )}
            >
              <Icon
                icon="heroicons:chevron-right-20-solid"
                className="h-5 w-5"
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "inline-flex cursor-pointer items-center justify-center w-12 h-12 rounded-md",
            {
              "bg-primary text-primary-foreground dark:bg-primary dark:text-black":
                activeSubmenu === index || isActive,
            }
          )}
        >
          {icon ? (
            <Icon icon={icon} className="w-6 h-6" />
          ) : (
            <Icon icon="solar:folder-line-duotone" className="w-6 h-6" />
          )}
        </div>
      )}
    </>
  );
};

export default SubMenuHandler;
