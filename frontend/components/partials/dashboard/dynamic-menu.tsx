"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import { getMenu } from "@/config/menu";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icon as Iconify } from "@iconify/react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/hooks/use-settings";

// Simple Icon component with error handling
function Icon({ icon, className }: { icon?: string; className?: string }) {
  if (!icon) return null;
  
  try {
    // Import Iconify React component dynamically to avoid SSR issues
    const IconifyIcon = require("@iconify/react").Icon;
    return <IconifyIcon icon={icon} className={className} />;
  } catch (error) {
    console.warn(`Failed to load icon: ${icon}`, error);
    // Return a fallback icon or empty div
    return <div className={`${className} bg-muted rounded`} />;
  }
}

// Recursively search for a menu item matching a given href in both child and megaMenu arrays.
function findMenuItemByHref(
  items: MenuItem[] | undefined,
  href: string
): MenuItem | null {
  if (!items) return null;
  for (const item of items) {
    if (item.href === href) return item;
    const foundChild = findMenuItemByHref(item.child, href);
    if (foundChild) return foundChild;
    const foundMega = findMenuItemByHref(item.megaMenu, href);
    if (foundMega) return foundMega;
  }
  return null;
}

// Renders sub‐child items as small link buttons.
function renderSubChildLinks(subItems: MenuItem[]) {
  return (
    <div className="flex flex-wrap gap-2">
      {subItems.map((sub) => (
        <Link key={sub.key} href={sub.href || "#"}>
          <Button variant="outline" size="sm">
            {sub.title}
        </Button>
        </Link>
      ))}
    </div>
  );
}

// Renders a grid of cards for a standard list of child items.
// Skips any item whose href matches currentPath.
function renderMenuCards(
  items: MenuItem[],
  currentPath: string | undefined,
  t: any
) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items
        .filter((item) => item.href !== currentPath)
        .map((item) => {
          const subChild =
            item.child && item.child.length > 0 ? item.child : null;
          const isDisabled = item.disabled || false;
          
          return (
            <Card
              key={item.key}
              className={cn(
                "bg-card text-card-foreground shadow-2xs hover:shadow-md transition-all duration-200",
                isDisabled && "opacity-60 cursor-not-allowed border-dashed"
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon 
                    icon={item.icon} 
                    className={cn(
                      "text-2xl text-primary",
                      isDisabled && "text-muted-foreground"
                    )} 
                  />
                  <CardTitle className={cn(isDisabled && "text-muted-foreground")}>
                    {item.title}
                  </CardTitle>
                </div>
                {item.description && (
                  <CardDescription className={cn(
                    "mt-2",
                    isDisabled && "text-muted-foreground/60"
                  )}>
                    {item.description}
                  </CardDescription>
                )}
              </CardHeader>

              {item.href && (
                <CardContent>
                  {isDisabled ? (
                    <Button variant="secondary" disabled className="cursor-not-allowed">
                      {t("extension_not_installed")}
                    </Button>
                  ) : (
                    <Link href={item.href}>
                    <Button variant="secondary">
                        {t("go_to")}{" "}
                        {item.title}
                      </Button>
                      </Link>
                  )}
                </CardContent>
              )}

              {!item.href && item.megaMenu && item.megaMenu.length > 0 && (
                <CardContent>
                  <p className={cn(
                    "text-sm text-muted-foreground",
                    isDisabled && "text-muted-foreground/60"
                  )}>
                    {t("Contains")}
                    {item.megaMenu.length} {t("extension_categories")}
                  </p>
                </CardContent>
              )}

              {subChild && (
                <CardFooter>
                  {isDisabled ? (
                    <div className="flex flex-wrap gap-2">
                      {subChild.map((sub) => (
                        <Button key={sub.key} variant="outline" size="sm" disabled className="cursor-not-allowed">
                          {sub.title}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    renderSubChildLinks(subChild)
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
    </div>
  );
}

// Renders a megaMenu with groups containing images and additional addons.
// Each group is rendered in a 2‑column grid.
function renderMegaMenuGroupsWithAddons(
  groups: MenuItem[],
  currentPath: string | undefined,
  t: any
) {
  try {
    // Filter out groups that have no href and no visible children, but keep disabled extensions for admin
    const visibleGroups = groups.filter((group) => {
      // Don't show if it's the current path
      if (group.href === currentPath) return false;

      // If group has a direct href, show it (even if disabled)
      if (group.href) return true;

      // If group has visible children (addons), show it
      const addons = group.child ?? [];
      return addons.length > 0;
    });
    
    if (visibleGroups.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-xl text-muted-foreground">
            {t("no_extensions_available_or_enabled")}.
          </p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {visibleGroups.map((group) => {
          const addons = group.child ?? [];
          const isGroupDisabled = group.disabled || false;
          
          return (
            <Card
              key={group.key}
              className={cn(
                "bg-card text-card-foreground shadow-2xs hover:shadow-md transition-all duration-200",
                isGroupDisabled && "opacity-60 cursor-not-allowed border-dashed"
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon 
                    icon={group.icon} 
                    className={cn(
                      "text-2xl text-primary",
                      isGroupDisabled && "text-muted-foreground"
                    )} 
                  />
                  <CardTitle className={cn(isGroupDisabled && "text-muted-foreground")}>
                    {group.title}
                  </CardTitle>
                </div>
                {group.description && (
                  <CardDescription className={cn(
                    "mt-2",
                    isGroupDisabled && "text-muted-foreground/60"
                  )}>
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>

              {group.image && (
                <CardContent>
                  <img
                    src={group.image}
                    alt={group.title}
                    className={cn(
                      "rounded w-full object-cover min-h-[400px] max-h-[450px]",
                      isGroupDisabled && "grayscale opacity-50"
                    )}
                  />
                </CardContent>
              )}

              {group.href && (
                <CardContent>
                  {isGroupDisabled ? (
                    <Button variant="secondary" disabled className="cursor-not-allowed">
                      {t("category_not_available")}
                    </Button>
                  ) : (
                    <Link href={group.href}>
                    <Button variant="secondary">
                        {t("go_to")}
                        {group.title}
                      </Button>
                      </Link>
                  )}
                </CardContent>
              )}

              {addons.length > 0 && (
                <CardFooter className="gap-4 flex flex-col">
                  {addons.map((addon) => {
                    const subSubChild = addon.child ?? [];
                    const isAddonDisabled = addon.disabled || false;
                    
                    return (
                      <div
                        key={addon.key}
                        className={cn(
                          "p-3 rounded-md border border-border w-full h-full transition-colors duration-200",
                          isAddonDisabled && "opacity-60 cursor-not-allowed border-dashed"
                        )}
                        onMouseEnter={(e) => {
                          if (!isAddonDisabled) {
                            try {
                              e.currentTarget.style.borderColor = 'hsl(var(--info))';
                            } catch (error) {
                              console.warn('Hover effect error:', error);
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isAddonDisabled) {
                            try {
                              e.currentTarget.style.borderColor = 'hsl(var(--border))';
                            } catch (error) {
                              console.warn('Hover effect error:', error);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            icon={addon.icon}
                            className={cn(
                              "text-xl text-primary",
                              isAddonDisabled && "text-muted-foreground"
                            )}
                          />
                          <span className={cn(
                            "font-medium",
                            isAddonDisabled && "text-muted-foreground"
                          )}>
                            {addon.title}
                          </span>
                        </div>
                        {addon.description && (
                          <p className={cn(
                            "text-sm text-muted-foreground mb-2",
                            isAddonDisabled && "text-muted-foreground/60"
                          )}>
                            {addon.description}
                          </p>
                        )}
                        {addon.href && (
                          isAddonDisabled ? (
                            <Button variant="secondary" size="sm" disabled className="cursor-not-allowed">
                              {t("extension_not_installed")}
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm">
                              <Link href={addon.href}>
                                {t("go_to")}
                                {addon.title}
                              </Link>
                            </Button>
                          )
                        )}
                        {subSubChild.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {subSubChild.map((sub) => 
                              isAddonDisabled || sub.disabled ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                key={sub.key}
                                  disabled
                                  className="cursor-not-allowed"
                              >
                                  {sub.title}
                                </Button>
                                ) : (
                                <Link key={sub.key} href={sub.href ?? "#"}>
                                  <Button variant="outline" size="sm">
                                    {sub.title}
                              </Button>
                                </Link>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    );
  } catch (error) {
    console.error('Error in renderMegaMenuGroupsWithAddons:', error);
    return (
      <div className="p-8 text-center">
        <h3 className="text-lg font-semibold text-red-600 mb-2">
          {t("error_loading_extensions")}
        </h3>
        <p className="text-muted-foreground">
          {t("there_was_an_error_rendering_the_extensions_menu")}
        </p>
      </div>
    );
  }
}

// Main dynamic menu component that renders different views depending on route and menu data.
export function DynamicMenuView() {
  const t = useTranslations("components/partials/dashboard/dynamic-menu");
  const { user } = useUserStore();
  const {
    settings,
    extensions,
    isLoading,
    settingsError,
    settingsFetched,
    retryFetch,
  } = useSettings();
  const pathname = usePathname();

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl">{t("please_login_to_view_this_page")}.</p>
      </div>
    );
  }

  // Show loading state
  if (isLoading && !settingsFetched) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl">{t("loading_menu")}...</p>
      </div>
    );
  }

  // Show error state with retry option
  if (settingsError && !settingsFetched) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            {t("failed_to_load_menu")}
          </h2>
          <p className="text-muted-foreground mt-2">{settingsError}</p>
        </div>
        <Button onClick={retryFetch} variant="outline">
          {t("Retry")}
        </Button>
      </div>
    );
  }

  // Decide active menu type: admin if pathname includes "/admin", otherwise user.
  const activeMenuType = pathname.includes("/admin") ? "admin" : "user";

  // Filter the menu items based on the user, settings, and active menu type.
  const filteredMenu = getMenu({
    user,
    settings: settings ?? {},
    extensions: extensions ?? [],
    activeMenuType,
  });

  // Remove locale prefix if present.
  const normalizedPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");

  // If at base route, show top-level menu cards.
  if (
    (activeMenuType === "admin" && normalizedPath === "/admin") ||
    (activeMenuType === "user" && normalizedPath === "/user")
  ) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {activeMenuType === "admin" ? "Admin Menu" : "User Menu"}
        </h1>
        {renderMenuCards(filteredMenu, normalizedPath, t)}
      </div>
    );
  }

  // Special case for extensions page - show megaMenu items
  if (normalizedPath === "/admin/extensions") {
    const extensionsMenuItem = filteredMenu.find(
      (item) => item.key === "admin-extensions"
    );
    if (
      extensionsMenuItem?.megaMenu &&
      extensionsMenuItem.megaMenu.length > 0
    ) {
      try {
        return (
          <div className="px-4 py-8 sm:px-6 lg:px-8 mx-auto">
            <h1 className="text-3xl font-bold mb-4">
              {extensionsMenuItem.title}
            </h1>
            {extensionsMenuItem.description && (
              <p className="text-lg text-muted-foreground mb-6">
                {extensionsMenuItem.description}
              </p>
            )}
            {renderMegaMenuGroupsWithAddons(
              extensionsMenuItem.megaMenu,
              normalizedPath,
              t
            )}
          </div>
        );
      } catch (error) {
        console.error('Error rendering extensions page:', error);
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              {t("failed_to_load_extensions")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("there_was_an_error_loading_the_extensions_page")}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              {t("Retry")}
            </Button>
          </div>
        );
      }
    }
  }

  // Otherwise, try to find the matching menu item.
  const currentMenuItem =
    filteredMenu.find((item) => item.href === normalizedPath) ||
    findMenuItemByHref(filteredMenu, normalizedPath);
  if (!currentMenuItem) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl">{t("no_menu_data_found_for_this_route")}.</p>
      </div>
    );
  }

  // If the matched item has child items, show them in a card grid.
  if (currentMenuItem.child && currentMenuItem.child.length > 0) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8 mx-auto">
        <h1 className="text-3xl font-bold mb-4">{currentMenuItem.title}</h1>
        {currentMenuItem.description && (
          <p className="text-lg text-muted-foreground mb-6">
            {currentMenuItem.description}
          </p>
        )}
        {renderMenuCards(currentMenuItem.child, normalizedPath, t)}
      </div>
    );
  }

  // If the matched item has a megaMenu array, render it with a 2‑column layout.
  if (currentMenuItem.megaMenu && currentMenuItem.megaMenu.length > 0) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8 mx-auto">
        <h1 className="text-3xl font-bold mb-4">{currentMenuItem.title}</h1>
        {currentMenuItem.description && (
          <p className="text-lg text-muted-foreground mb-6">
            {currentMenuItem.description}
          </p>
        )}
        {renderMegaMenuGroupsWithAddons(
          currentMenuItem.megaMenu,
          normalizedPath,
          t
        )}
      </div>
    );
  }

  // Fallback view if no submenu items are available.
  return (
    <div className="p-8 text-center">
      <p className="text-xl text-muted-foreground">
        {t("no_submenu_items_available")}.
      </p>
    </div>
  );
}
