/**
 * Resolving which navigation entry is "active".
 *
 * Menu hrefs nest by URL prefix: `/admin/system/geo-restriction` is the parent
 * page of `/admin/system/geo-restriction/settings`. A per-item test of the form
 * `pathname === href || pathname.startsWith(href + "/")` is therefore true for
 * BOTH entries on the settings page, so two siblings light up at once (the
 * "Geo Restrictions" + "Geo Policy" double-checkmark).
 *
 * The page you are actually on is the *most specific* — longest — href that
 * matches. That cannot be decided by looking at one item, so it is resolved
 * once against the whole tree and each item is then compared to the winner.
 *
 * Ancestor highlighting (a category glowing because a descendant is active) is
 * a different question and stays where it is: callers walk their own children
 * and ask this predicate about each one.
 */

/** Menu branches that can hold nested items, in the order they are rendered. */
const BRANCHES = ["child", "megaMenu", "multi_menu", "nested"] as const;

function isRealHref(href: string | undefined): href is string {
  return Boolean(href) && href !== "#";
}

/** True when `pathname` is `href` itself or a page underneath it. */
function pathMatches(pathname: string, href: string, exact?: boolean): boolean {
  if (pathname === href) return true;
  if (exact) return false;
  // Trailing slash is normalised so "/admin/" does not become "/admin//".
  const prefix = href.endsWith("/") ? href : `${href}/`;
  return pathname.startsWith(prefix);
}

/**
 * The longest href anywhere in `items` that the current path sits under, or
 * null when this tree does not contain the current page at all.
 */
export function resolveActiveHref(
  pathname: string,
  items: MenuItem[] | undefined
): string | null {
  let best: string | null = null;

  const walk = (list: MenuItem[] | undefined) => {
    if (!list) return;
    for (const item of list) {
      if (
        isRealHref(item?.href) &&
        pathMatches(pathname, item.href, item.exact) &&
        (best === null || item.href.length > best.length)
      ) {
        best = item.href;
      }
      for (const branch of BRANCHES) walk(item?.[branch]);
    }
  };

  walk(items);
  return best;
}

/**
 * Builds the per-item predicate. Only the single most specific match is active,
 * so sibling entries can never both be highlighted.
 *
 * Two entries pointing at the same href will both report active — they are the
 * same destination, so that is correct rather than a collision.
 */
export function createIsItemActive(
  pathname: string,
  items: MenuItem[] | undefined
): (item: MenuItem | null | undefined) => boolean {
  const activeHref = resolveActiveHref(pathname, items);

  return (item) =>
    activeHref !== null && isRealHref(item?.href) && item.href === activeHref;
}
