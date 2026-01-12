import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { twMerge } from "tailwind-merge";

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) return `${currency} 0.00`;

  // Determine appropriate decimal places based on the value
  // For small numbers (< 0.01), show more decimals to display the actual value
  let maxDecimals = 2;
  if (currency === "BTC") {
    maxDecimals = 8;
  } else if (numericAmount > 0 && numericAmount < 0.01) {
    // For very small values, calculate how many decimals needed
    const decimalStr = numericAmount.toString();
    const decimalMatch = decimalStr.match(/\.0*[1-9]/);
    if (decimalMatch) {
      maxDecimals = Math.min(8, decimalMatch[0].length);
    } else {
      maxDecimals = 4;
    }
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    }).format(numericAmount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${numericAmount.toFixed(maxDecimals)}`;
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "N/A";

  // If it's a string that looks like a quarter (Q1 2024, Q4 2023, etc.), return as-is
  if (typeof dateInput === "string" && /^Q[1-4]\s*\d{4}$/i.test(dateInput.trim())) {
    return dateInput;
  }

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  // Check if the date is valid
  if (!date || isNaN(date.getTime())) {
    // If it's a string, return it as-is (might be a custom date format)
    if (typeof dateInput === "string") return dateInput;
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value / 100);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export const formatTimeAgo = (date: string | Date) => {
  if (!date) return "N/A";
  try {
    const parsedDate = date instanceof Date ? date : new Date(date);
    return formatDistanceToNow(parsedDate, { addSuffix: true });
  } catch (err) {
    return "Invalid date";
  }
};
