import React from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { useSidebar } from "@/store";
import { useMediaQuery } from "@/hooks/use-media-query";

const MultiNestedMenu = ({
  subItem,
  subIndex,
  activeMultiMenu,
  isItemActive,
}: {
  subItem: any;
  subIndex: number;
  activeMultiMenu: number | null;
  isItemActive: (grandChildIndex: number) => boolean;
}) => {
  const { setMobileMenu } = useSidebar();
  const isMobile = useMediaQuery("(max-width: 1279px)");

  const handleClick = () => {
    if (isMobile) {
      setMobileMenu(false);
    }
  };

  return (
    <Collapsible open={activeMultiMenu === subIndex}>
      <CollapsibleContent className="CollapsibleContent">
        <ul className="space-y-3 pl-1">
          {subItem?.child?.map((item: any, i: number) => {
            const isActiveGrandChild = isItemActive(i);
            return (
              <li className="first:pt-3" key={i}>
                <Link href={item.href as any} onClick={handleClick}>
                  <span
                    className={cn(
                      "text-sm flex gap-3 items-center transition-all duration-150 capitalize hover:text-primary",
                      {
                        "text-primary": isActiveGrandChild,
                        "text-muted-foreground": !isActiveGrandChild,
                      }
                    )}
                  >
                    <span
                      className={cn("inline-flex h-2 w-2 border rounded-full", {
                        "bg-primary ring-primary/30 ring-[4px] border-primary":
                          isActiveGrandChild,
                        "border-gray-300": !isActiveGrandChild,
                      })}
                    ></span>
                    <span className="flex-1">{item.title}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MultiNestedMenu;
