import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLocationMatch(
  href: string,
  locationName: string,
  hasChildren = false
): boolean {
  // If the item has children, treat it as a parent route:
  //   - Active if exactly at its href (e.g. `/admin/crm`)
  //   - OR if the route starts with its href + "/" (e.g. `/admin/crm/user`)
  if (hasChildren) {
    return locationName === href || locationName.startsWith(href + "/");
  } else {
    // If no children, must be an exact match
    return locationName === href;
  }
}

export const formatTime = (time: number | Date | string): string => {
  if (!time) return "";

  const date = new Date(time);
  const formattedTime = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return formattedTime;
};

// object check
export function isObjectNotEmpty(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  return Object.keys(obj).length > 0;
}

export function formatDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// random word
export function getWords(inputString: string): string {
  // Remove spaces from the input string
  const stringWithoutSpaces = inputString.replace(/\s/g, "");

  // Extract the first three characters
  return stringWithoutSpaces.substring(0, 3);
}

// for path name - remove locale prefix from pathname
export function getDynamicPath(pathname: any): any {
  // Get configured locales from environment variable
  const languagesString = process.env.NEXT_PUBLIC_LANGUAGES || "";
  const configuredLocales = languagesString
    .split(/[,\n\r]+/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);

  // Use configured locales or fallback to common ones
  const locales = configuredLocales.length > 0 ? configuredLocales : ["en", "ar"];

  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return `/${pathname.slice(locale.length + 2)}`;
    }
  }

  return pathname;
}

export const formatCurrency = (amount: number, currency: string) => {
  // List of valid ISO 4217 currency codes that Intl.NumberFormat supports
  const validCurrencyCodes = [
    "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
    "MXN", "SGD", "HKD", "NOK", "TRY", "ZAR", "BRL", "INR", "KRW", "RUB"
  ];

  // Check if the currency is a valid ISO currency code
  const isValidCurrency = validCurrencyCodes.includes(currency.toUpperCase());

  if (isValidCurrency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount);
    } catch (error) {
      // Fallback if there's still an error
      return `${currency} ${amount.toFixed(2)}`;
    }
  } else {
    // For cryptocurrencies and other non-ISO currencies, format manually
    const formattedValue = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8, // Cryptocurrencies often have more decimal places
    }).format(amount);
    
    return `${formattedValue} ${currency}`;
  }
};
