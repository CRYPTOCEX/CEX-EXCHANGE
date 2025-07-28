import React from "react";
import ListItem from "./list-item";
import { Icon } from "@iconify/react";

interface ChildMenuProps {
  childItems: any[];
}

export default function ChildMenu({ childItems }: ChildMenuProps) {
  return (
    <div className="min-w-[200px] p-4">
      {childItems.map((childItem: any, cIndex: number) => {
        const childHref = childItem.href || "#";
        return (
          <ListItem
            key={childItem.key || `child-${cIndex}`}
            title={childItem.title}
            href={childHref}
            className="text-sm font-medium text-foreground"
          >
            {childItem.icon && (
              <Icon icon={childItem.icon} className="h-5 w-5" />
            )}
          </ListItem>
        );
      })}
    </div>
  );
}
