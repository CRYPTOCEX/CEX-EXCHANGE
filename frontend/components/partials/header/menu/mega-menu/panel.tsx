import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import ListItem from "../list-item";
import { Icon } from "@iconify/react";
import { Link } from "@/i18n/routing";

interface MegaMenuPanelProps {
  category: any;
  hoveredExtension: any;
  setHoveredExtension: React.Dispatch<React.SetStateAction<any>>;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function MegaMenuPanel({
  category,
  hoveredExtension,
  setHoveredExtension,
  isFirst = false,
  isLast = false,
}: MegaMenuPanelProps) {
  // Add safety checks to prevent errors
  if (!category) {
    return <div className="flex items-center justify-center w-full h-full max-w-[90vw]">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>;
  }

  const categoryHasChildren = category?.child && Array.isArray(category.child) && category.child.length > 0;
  const index =
    hoveredExtension && categoryHasChildren && category.child
      ? category.child.indexOf(hoveredExtension)
      : -1;
  const localIsFirst = index === 0 && categoryHasChildren;
  const localIsLast = categoryHasChildren && category.child
    ? index === category.child.length - 1
    : false;

  try {
    return (
      <div className="flex items-stretch w-full h-full max-w-[90vw]">
        {categoryHasChildren && (
          <div className="w-[250px] min-w-[250px] flex flex-col gap-2">
            {category.child.map((extensionItem: any, eIndex: number) => {
              const extensionHref = extensionItem?.href || "#";
              const isActive = hoveredExtension === extensionItem;
              const isDisabled = extensionItem?.disabled || false;
              
              return (
                <div
                  key={extensionItem?.key || `extension-${eIndex}`}
                  onMouseEnter={() => !isDisabled && setHoveredExtension(extensionItem)}
                  className={cn(
                    "p-2 transition-colors",
                    extensionItem?.child ? "rounded-l-md" : "rounded-md",
                    isDisabled 
                      ? "opacity-60 cursor-not-allowed bg-muted/20" 
                      : "cursor-pointer",
                    isActive && !isDisabled
                      ? "bg-muted/50 no-underline outline-hidden focus:shadow-md"
                      : "bg-transparent"
                  )}
                >
                  {isDisabled ? (
                    <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {extensionItem?.icon && (
                          <Icon icon={extensionItem.icon} className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="capitalize whitespace-nowrap">{extensionItem?.title || 'Unknown'}</span>
                      </div>
                      {extensionItem?.child && extensionItem.child.length > 0 && (
                        <Icon icon="mdi:chevron-right" className="h-5 w-5 flex-shrink-0 opacity-50" />
                      )}
                    </div>
                  ) : (
                    <Link
                      href={extensionHref}
                      className="flex items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {extensionItem?.icon && (
                          <Icon icon={extensionItem.icon} className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="capitalize whitespace-nowrap">{extensionItem?.title || 'Unknown'}</span>
                      </div>
                      {extensionItem?.child && extensionItem.child.length > 0 && (
                        <Icon icon="mdi:chevron-right" className="h-5 w-5 flex-shrink-0" />
                      )}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={cn(
            "flex-1 min-w-[350px] flex items-center justify-center",
            (localIsFirst || isFirst) && "rounded-tl-none",
            (localIsLast || isLast) && "rounded-bl-none"
          )}
        >
          {hoveredExtension?.child?.length > 0 ? (
            <div
              className={cn(
                "flex flex-col bg-muted/50 no-underline outline-hidden focus:shadow-md p-4 rounded-md w-full h-full min-h-[300px]",
                (localIsFirst || isFirst) && "rounded-tl-none",
                (localIsLast || isLast) && "rounded-bl-none"
              )}
            >
              {hoveredExtension.child.map((subItem: any, sIndex: number) => {
                const subItemHref = subItem?.href || "#";
                return (
                  <ListItem
                    key={subItem?.key || `subItem-${sIndex}`}
                    href={subItemHref}
                    title={subItem?.title || 'Unknown'}
                    className="w-full p-2 bg-primary/5 hover:bg-primary/10 transition-colors rounded-md"
                  >
                    {subItem?.icon && (
                      <Icon icon={subItem.icon} className="h-5 w-5 flex-shrink-0" />
                    )}
                  </ListItem>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                "h-full w-full min-h-[300px] relative flex items-center justify-center bg-muted/20 rounded-md",
                (localIsFirst || isFirst) && "rounded-tl-none",
                (localIsLast || isLast) && "rounded-bl-none"
              )}
            >
              {category.image ? (
                <Image
                  src={category.image}
                  alt=""
                  fill
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <div className="text-muted-foreground text-sm max-w-[350px] text-center px-4">
                  {category.description || 'No description available'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering mega menu panel:', error);
    return (
      <div className="flex items-center justify-center w-full h-full max-w-[90vw]">
        <div className="text-center">
          <div className="text-muted-foreground text-sm mb-2">Something went wrong</div>
          <div className="text-xs text-muted-foreground">Please refresh the page</div>
        </div>
      </div>
    );
  }
}
