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
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { useSettings } from "@/hooks/use-settings";
import { useChrome } from "@/components/chrome/chrome-provider";

/* The local `Icon` wrapper that used to sit here is gone. It `require()`d
   @iconify/react inside a try/catch "to avoid SSR issues" — the real issue was
   that the glyph came off api.iconify.design at runtime, so it could not render
   on the server at all and its catch branch painted a grey box. The shared
   resolver is a plain lookup: it renders on the server and cannot throw. */

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

// Component for rendering a grid of cards for a standard list of child items.
// Skips any item whose href matches currentPath.
function MenuCards({
  items,
  currentPath,
  loading = false,
  pendingCount = 6,
}: {
  items: MenuItem[];
  currentPath: string | undefined;
  /**
   * Draw the grid with pending cards instead of a "Loading menu…" sentence.
   *
   * The menu tree is not known until `useSettings` answers — permissions,
   * installed extensions and admin overrides all edit it — but the SHAPE of the
   * page is: a three-column card grid, in a card whose header is an icon beside
   * a title and whose body is one secondary button. That is what waits here.
   */
  loading?: boolean;
  /** How many pending cards. A menu has no knowable length before it arrives. */
  pendingCount?: number;
}) {
  const tCommon = useTranslations("common");
  const tComponents = useTranslations("components");

  /* ONE list, one card body. Synthesizing the pending entries here rather than
     writing a second grid means the pending card is the real card by
     construction — it cannot fall behind a change to the header, the padding or
     the button. */
  const cards: MenuItem[] = loading
    ? Array.from(
        { length: Math.max(1, pendingCount) },
        (_, i) => ({ key: `pending-${i}`, title: "", icon: "" }) as MenuItem
      )
    : items.filter((item) => item.href !== currentPath);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((item) => {
          const subChild =
            item.child && item.child.length > 0 ? item.child : null;
          const isDisabled = item.disabled || false;

          return (
            <Card
              key={item.key}
              className={cn(
                "bg-card text-card-foreground transition-all duration-200",
                isDisabled && "opacity-60 cursor-not-allowed border-dashed"
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  {/* The icon is the TALLEST thing in this row — a 24px glyph
                      against a `leading-none` 16px title — so its box has to be
                      held or the header shrinks by 8px per card while pending.
                      One element in both states: the wrapper is the 24px box,
                      and it pulses only while there is no glyph inside it. An
                      item with no icon still renders nothing at all, exactly as
                      before, because the whole slot stays conditional. */}
                  {(loading || item.icon) && (
                    <span
                      className={cn(
                        "inline-flex size-6 shrink-0 items-center justify-center",
                        loading && "animate-pulse rounded bg-muted"
                      )}
                    >
                      <Icon
                        icon={item.icon}
                        className={cn(
                          "text-2xl text-primary",
                          isDisabled && "text-muted-foreground"
                        )}
                      />
                    </span>
                  )}
                  <CardTitle className={cn(isDisabled && "text-muted-foreground")}>
                    <Loadable loading={loading} chars={14}>
                      {item.title}
                    </Loadable>
                  </CardTitle>
                </div>
                {loading || item.description ? (
                  <CardDescription className={cn(
                    "mt-2",
                    isDisabled && "text-muted-foreground/60"
                  )}>
                    <Loadable loading={loading} chars={34}>
                      {item.description}
                    </Loadable>
                  </CardDescription>
                ) : null}
              </CardHeader>

              {/* The body renders while pending too: every resolved card with an
                  href has one, and a 36px button appearing after the fact grows
                  every card in the row. */}
              {(loading || item.href) && (
                <CardContent>
                  {loading ? (
                    <Button variant="secondary" disabled>
                      <SkeletonText chars={12} />
                    </Button>
                  ) : isDisabled ? (
                    <Button variant="secondary" disabled className="cursor-not-allowed">
                      {tComponents("extension_not_installed")}
                    </Button>
                  ) : (
                    <Link href={item.href!}>
                    <Button variant="secondary">
                        {tComponents("go_to")}{" "}
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
                    {tCommon("contains")}
                    {item.megaMenu.length} {tComponents("extension_categories")}
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

// Component for rendering a megaMenu with groups containing images and additional addons.
// Each group is rendered in a 2‑column grid.
function MegaMenuGroupsWithAddons({
  groups,
  currentPath,
}: {
  groups: MenuItem[];
  currentPath: string | undefined;
}) {
  const tComponents = useTranslations("components");
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
            {tComponents("no_extensions_available_or_enabled")}.
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
                "bg-card text-card-foreground transition-all duration-200",
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
                      {tComponents("category_not_available")}
                    </Button>
                  ) : (
                    <Link href={group.href}>
                    <Button variant="secondary">
                        {tComponents("go_to")}
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
                              {tComponents("extension_not_installed")}
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm">
                              <Link href={addon.href}>
                                {tComponents("go_to")}
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
        <h3 className="text-lg font-semibold text-destructive mb-2">
          {tComponents("error_loading_extensions")}
        </h3>
        <p className="text-muted-foreground">
          {tComponents("there_was_an_error_rendering_the_extensions_menu")}
        </p>
      </div>
    );
  }
}

// Main dynamic menu component that renders different views depending on route and menu data.
export function DynamicMenuView() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
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
  /* Read before the early returns below — every hook in this component has to
     run on every render, and the `!user` / loading / error branches all bail out
     after this point. */
  const { menuOverrides } = useChrome();

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl">{t("please_login_to_view_this_page")}.</p>
      </div>
    );
  }

  // Show error state with retry option
  if (settingsError && !settingsFetched) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">
            {t("failed_to_load_menu")}
          </h2>
          <p className="text-muted-foreground mt-2">{settingsError}</p>
        </div>
        <Button onClick={retryFetch} variant="outline">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  // Decide active menu type: admin if pathname includes "/admin", otherwise user.
  const activeMenuType = pathname.includes("/admin") ? "admin" : "user";

  // Filter the menu items based on the user, settings, and active menu type.
  /* `menuOverrides` is the admin's patch for this scope; `getMenu` picks the
     scope from `activeMenuType` and applies it after the permission and
     extension filters. No memo to extend here — this call is in the render body
     and already re-runs whenever the context value changes. */
  const filteredMenu = getMenu({
    user,
    settings: settings ?? {},
    extensions: extensions ?? [],
    activeMenuType,
    menuOverrides,
  });

  // Remove locale prefix if present.
  const normalizedPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");

  const isBaseRoute =
    (activeMenuType === "admin" && normalizedPath === "/admin") ||
    (activeMenuType === "user" && normalizedPath === "/user");

  /**
   * SETTINGS NOT IN YET — same page, values pending.
   * ==========================================================================
   *
   * This used to be an early `return <div className="p-8 text-center"><p
   * className="text-xl">Loading menu…</p></div>` ahead of everything below: a
   * ~100px band of centred prose standing in for a page whose every resolved
   * shape is the same thing — the `px-4 py-8 sm:px-6 lg:px-8` container, a
   * `text-3xl` heading, and a card grid. On /admin that grid is six to twelve
   * cards, i.e. several hundred pixels; the entire page arrived as shift, and
   * it did so on every hard navigation into the dashboard.
   *
   * Folding the pending case into the base-route branch means there is one tree
   * for both, not two that can drift. `MenuCards` takes the wait; the container
   * and the heading are knowable from the URL alone.
   *
   * TWO THINGS STILL SETTLE, and both are deliberate:
   *   - the CARD COUNT, because a menu's length depends on the permissions and
   *     extensions we are waiting for. Six is the container reservation.
   *   - the HEADING TEXT on a non-base route, which is the matched item's own
   *     title. Its BOX does not move — the `text-3xl` line and its margin are
   *     the same — so this is a word changing, not a layout shifting.
   */
  const awaitingSettings = isLoading && !settingsFetched;

  if (awaitingSettings || isBaseRoute) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* `mb-6 text-center` is the base-route heading; every other branch
            below uses `mb-4` left-aligned, so the pending heading matches
            whichever one it is about to become. */}
        <h1
          className={cn(
            "text-3xl font-bold",
            isBaseRoute ? "mb-6 text-center" : "mb-4"
          )}
        >
          <Loadable loading={awaitingSettings && !isBaseRoute} chars={12}>
            {activeMenuType === "admin" ? t("admin_menu") : t("user_menu")}
          </Loadable>
        </h1>
        <MenuCards
          items={filteredMenu}
          currentPath={normalizedPath}
          loading={awaitingSettings}
        />
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
            <MegaMenuGroupsWithAddons
              groups={extensionsMenuItem.megaMenu}
              currentPath={normalizedPath}
            />
          </div>
        );
      } catch (error) {
        console.error('Error rendering extensions page:', error);
        return (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold text-destructive mb-4">
              {t("failed_to_load_extensions")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("there_was_an_error_loading_the_extensions_page")}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              {tCommon("retry")}
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
        <MenuCards items={currentMenuItem.child} currentPath={normalizedPath} />
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
        <MegaMenuGroupsWithAddons
          groups={currentMenuItem.megaMenu}
          currentPath={normalizedPath}
        />
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
