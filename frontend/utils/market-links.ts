/**
 * Utility function to get the market link route based on system settings
 * Returns the route path (/trade or /binary) for market links
 */
export function getMarketLinkRoute(settings: Record<string, string> | null): string {
  // Default to /trade if settings not loaded or setting not found
  if (!settings || !settings.marketLinkRoute) {
    return "/trade";
  }

  const route = settings.marketLinkRoute;

  // Validate the route is one of the allowed values
  if (route === "trade" || route === "binary") {
    return `/${route}`;
  }

  // Fallback to /trade if invalid value
  return "/trade";
}

/**
 * Builds a complete market link URL with symbol query parameter
 * @param settings - System settings object
 * @param currency - The base currency (e.g., "BTC")
 * @param pair - The quote currency (e.g., "USDT")
 * @returns Complete URL with route and symbol parameter
 */
export function buildMarketLink(
  settings: Record<string, string> | null,
  currency: string,
  pair: string
): string {
  const route = getMarketLinkRoute(settings);
  return `${route}?symbol=${currency}-${pair}`;
}
