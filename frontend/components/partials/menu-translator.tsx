import { useTranslations } from "next-intl";

/**
 * Custom hook to get translated menu items
 * Handles both title and description translations
 */
export function useMenuTranslations() {
  const t = useTranslations("menu");

  /**
   * Get translated title for a menu item
   * Converts menu keys like "admin-dashboard" to translation paths like "admin.dashboard.title"
   */
  const getTitle = (item: any): string => {
    // Return fallback immediately if no valid key
    if (!item?.key || typeof item.key !== 'string' || item.key.trim() === '') {
      return item?.title || "";
    }

    const cleanKey = item.key.trim();

    // Validate key format
    if (cleanKey.startsWith('.') || cleanKey.endsWith('.') || cleanKey.includes('..')) {
      return item?.title || "";
    }

    try {
      // Convert key from "admin-dashboard" to "admin.dashboard.title"
      const translationKey = cleanKey.replace(/-/g, '.') + '.title';

      // Attempt translation
      const result = t(translationKey as any);

      // Check if translation was successful
      // If result looks like a key path (contains dots), translation likely failed
      if (result && typeof result === 'string') {
        // If the result is the same as our key, translation failed
        if (result === translationKey) {
          return item.title || "";
        }

        // If result contains the translation key pattern, it's likely a failed translation
        if (result.includes('.title') || result.includes('.description')) {
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
   */
  const getDescription = (item: any): string => {
    // Return fallback immediately if no valid key or description
    if (!item?.key || typeof item.key !== 'string' || item.key.trim() === '' || !item?.description) {
      return item?.description || "";
    }

    const cleanKey = item.key.trim();

    // Validate key format
    if (cleanKey.startsWith('.') || cleanKey.endsWith('.') || cleanKey.includes('..')) {
      return item?.description || "";
    }

    try {
      // Convert key from "admin-dashboard" to "admin.dashboard.description"
      const translationKey = cleanKey.replace(/-/g, '.') + '.description';

      // Attempt translation
      const result = t(translationKey as any);

      // Check if translation was successful
      if (result && typeof result === 'string') {
        // If the result is the same as our key, translation failed
        if (result === translationKey) {
          return item.description || "";
        }

        // If result contains the translation key pattern, it's likely a failed translation
        if (result.includes('.title') || result.includes('.description')) {
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
