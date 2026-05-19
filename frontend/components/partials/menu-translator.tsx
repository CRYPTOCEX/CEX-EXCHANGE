"use client";

import { useTranslations } from "next-intl";

/**
 * Custom hook to get translated menu items
 * Handles both title and description translations
 *
 * For main admin/user menus: uses "menu" namespace with keys like "admin.dashboard.title"
 * For extension menus: uses extension namespace with "nav" prefix, e.g., "ext_p2p.nav.home.title"
 *
 * @param namespace - The translation namespace to use (default: "menu")
 * @param navPrefix - The prefix for navigation keys (default: "" for menu, "nav" for extensions)
 */
export function useMenuTranslations(
  namespace: string = "menu",
  navPrefix: string = ""
) {
   
  const t = useTranslations(namespace as any);

  /**
   * Get translated title for a menu item
   * Converts menu keys like "admin-dashboard" to translation paths like "admin.dashboard.title"
   * For extensions with navPrefix, converts "home" to "nav.home.title"
   */
  const getTitle = (item: any): string => {
    // Return fallback immediately if no valid key
    if (!item?.key || typeof item.key !== "string" || item.key.trim() === "") {
      return item?.title || "";
    }

    const cleanKey = item.key.trim();

    // Validate key format
    if (
      cleanKey.startsWith(".") ||
      cleanKey.endsWith(".") ||
      cleanKey.includes("..")
    ) {
      return item?.title || "";
    }

    try {
      // Convert key from "admin-dashboard" to "admin.dashboard.title"
      const keyPath = cleanKey.replace(/-/g, ".");
      const translationKey = navPrefix
        ? `${navPrefix}.${keyPath}.title`
        : `${keyPath}.title`;

      // Attempt translation
      const result = t(translationKey as any);

      // Check if translation was successful
      // If result looks like a key path (contains dots), translation likely failed
      if (result && typeof result === "string") {
        // If the result is the same as our key, translation failed
        if (result === translationKey) {
          return item.title || "";
        }

        // If result contains the translation key pattern, it's likely a failed translation
        if (result.includes(".title") || result.includes(".description")) {
          return item.title || "";
        }

        // We have a valid translation
        return result;
      }

      // No valid result, return fallback
      return item.title || "";
    } catch (error) {
      // On error, return fallback
      return item.title || "";
    }
  };

  /**
   * Get translated description for a menu item
   * Converts menu keys like "admin-dashboard" to translation paths like "admin.dashboard.description"
   * For extensions with navPrefix, converts "home" to "nav.home.description"
   */
  const getDescription = (item: any): string => {
    // Return fallback immediately if no valid key or description
    if (
      !item?.key ||
      typeof item.key !== "string" ||
      item.key.trim() === "" ||
      !item?.description
    ) {
      return item?.description || "";
    }

    const cleanKey = item.key.trim();

    // Validate key format
    if (
      cleanKey.startsWith(".") ||
      cleanKey.endsWith(".") ||
      cleanKey.includes("..")
    ) {
      return item?.description || "";
    }

    try {
      // Convert key from "admin-dashboard" to "admin.dashboard.description"
      const keyPath = cleanKey.replace(/-/g, ".");
      const translationKey = navPrefix
        ? `${navPrefix}.${keyPath}.description`
        : `${keyPath}.description`;

      // Attempt translation
      const result = t(translationKey as any);

      // Check if translation was successful
      if (result && typeof result === "string") {
        // If the result is the same as our key, translation failed
        if (result === translationKey) {
          return item.description || "";
        }

        // If result contains the translation key pattern, it's likely a failed translation
        if (result.includes(".title") || result.includes(".description")) {
          return item.description || "";
        }

        // We have a valid translation
        return result;
      }

      // No valid result, return fallback
      return item.description || "";
    } catch (error) {
      // On error, return fallback
      return item.description || "";
    }
  };

  return { getTitle, getDescription };
}

/**
 * Helper to determine the correct namespace and prefix for extension menus
 *
 * @param extensionId - The extension identifier (e.g., "p2p", "affiliate", "nft")
 * @param isAdmin - Whether this is an admin menu
 * @returns { namespace, navPrefix } for use with useMenuTranslations
 */
export function getExtensionMenuNamespace(
  extensionId: string,
  isAdmin: boolean = false
): { namespace: string; navPrefix: string } {
  // Extension namespaces follow the pattern:
  // - Admin: ext_admin_{extensionId} with "nav" prefix
  // - User: ext_{extensionId} with "nav" prefix
  const namespace = isAdmin
    ? `ext_admin_${extensionId.replace(/\//g, "_")}`
    : `ext_${extensionId.replace(/\//g, "_")}`;

  return {
    namespace,
    navPrefix: "nav",
  };
}
