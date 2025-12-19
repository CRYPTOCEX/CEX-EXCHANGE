import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import ListItem from "../list-item";
import { Icon } from "@iconify/react";
import { Link } from "@/i18n/routing";
import { useMenuTranslations } from "@/components/partials/menu-translator";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("common");
  const tComponents = useTranslations("components");
  const { getTitle, getDescription } = useMenuTranslations();

  // Add safety checks to prevent errors
  if (!category) {
    return <div className="flex items-center justify-center w-full h-full max-w-[90vw]">
      <div className="text-muted-foreground text-sm">{t('loading')}</div>
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
      <div className="flex items-stretch h-full">
        {categoryHasChildren && (
          <div className="w-[250px] min-w-[250px] flex flex-col gap-2 shrink-0">
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
                    isActive ? "rounded-l-md" : "rounded-md",
                    isDisabled
                      ? "opacity-60 cursor-not-allowed bg-muted/40"
                      : "cursor-pointer",
                    isActive && !isDisabled
                      ? "bg-muted/40 no-underline outline-hidden focus:shadow-md"
                      : "bg-transparent"
                  )}
                >
                  {isDisabled ? (
                    <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {extensionItem?.icon && (
                          <Icon icon={extensionItem.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-1 rtl:ml-1" />
                        )}
                        <span className="capitalize whitespace-nowrap">{getTitle(extensionItem) || 'Unknown'}</span>
                      </div>
                      {extensionItem?.child && extensionItem.child.length > 0 && (
                        <Icon icon="mdi:chevron-right" className="h-5 w-5 flex-shrink-0 opacity-50 rtl:rotate-180" />
                      )}
                    </div>
                  ) : (
                    <Link
                      href={extensionHref}
                      className="flex items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {extensionItem?.icon && (
                          <Icon icon={extensionItem.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-1 rtl:ml-1" />
                        )}
                        <span className="capitalize whitespace-nowrap">{getTitle(extensionItem) || 'Unknown'}</span>
                      </div>
                      {extensionItem?.child && extensionItem.child.length > 0 && (
                        <Icon icon="mdi:chevron-right" className="h-5 w-5 flex-shrink-0 rtl:rotate-180" />
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
            "w-[500px] bg-muted/40 rounded-md min-h-[300px] p-5",
            (localIsFirst || isFirst) && "rounded-tl-none",
            (localIsLast || isLast) && "rounded-bl-none"
          )}
        >
          {hoveredExtension?.child?.length > 0 ? (
            <div className="flex flex-col h-full">
              {hoveredExtension.child.map((subItem: any, sIndex: number) => {
                const subItemHref = subItem?.href || "#";
                return (
                  <ListItem
                    key={subItem?.key || `subItem-${sIndex}`}
                    href={subItemHref}
                    title={getTitle(subItem) || 'Unknown'}
                    className="w-full p-2 bg-muted/30 hover:bg-muted/50 transition-colors rounded-md"
                  >
                    {subItem?.icon && (
                      <Icon icon={subItem.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-2 rtl:ml-2" />
                    )}
                  </ListItem>
                );
              })}
            </div>
          ) : hoveredExtension ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                {hoveredExtension?.icon && (
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon icon={hoveredExtension.icon} className="h-6 w-6 text-primary" />
                  </div>
                )}
                <h3 className="text-base font-semibold text-foreground">
                  {getTitle(hoveredExtension)}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {getDescription(hoveredExtension)}
              </p>
              {hoveredExtension?.features && hoveredExtension.features.length > 0 && (
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {tComponents("key_features")}
                  </h4>
                  <ul className="grid grid-cols-1 gap-1.5">
                    {hoveredExtension.features.map((feature: string, fIndex: number) => (
                      <li key={fIndex} className="flex items-center gap-2 text-xs text-foreground">
                        <Icon icon="ph:check-circle-fill" className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                {category?.icon && (
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon icon={category.icon} className="h-6 w-6 text-primary" />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {getTitle(category)}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {getDescription(category) || 'Hover over an extension to see details'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering mega menu panel:', error);
    return (
      <div className="flex items-center justify-center w-full h-full max-w-[90vw]">
        <div className="text-center">
          <div className="text-muted-foreground text-sm mb-2">{t("something_went_wrong")}</div>
          <div className="text-xs text-muted-foreground">{tComponents("please_refresh_the_page")}</div>
        </div>
      </div>
    );
  }
}
