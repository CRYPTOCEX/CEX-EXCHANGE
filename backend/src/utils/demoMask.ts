/**
 * Demo masking utility for hiding confidential data in demo mode.
 * Masks sensitive fields like emails, phones, etc. in API responses.
 */

const isDemo: boolean = process.env.NEXT_PUBLIC_DEMO_STATUS === "true";

/**
 * Masking strategies for different field types
 */
const MASK_PATTERNS: Record<string, (value: string) => string> = {
  email: (value: string) => {
    if (!value || typeof value !== "string") return value;
    const [local, domain] = value.split("@");
    if (!domain) return "***@***.***";
    const maskedLocal = local.length > 2
      ? local[0] + "*".repeat(Math.min(local.length - 2, 5)) + local[local.length - 1]
      : "**";
    const domainParts = domain.split(".");
    const maskedDomain = domainParts.map((part, i) =>
      i === domainParts.length - 1 ? part : "*".repeat(Math.min(part.length, 4))
    ).join(".");
    return `${maskedLocal}@${maskedDomain}`;
  },
  phone: (value: string) => {
    if (!value || typeof value !== "string") return value;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) return "***";
    return value.slice(0, 3) + "*".repeat(Math.max(value.length - 6, 3)) + value.slice(-3);
  },
  mobile: (value: string) => MASK_PATTERNS.phone(value),
  // Wallet address masking - show first 6 and last 4 characters
  address: (value: string) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 10) return "*".repeat(value.length);
    return value.slice(0, 6) + "*".repeat(Math.min(value.length - 10, 12)) + value.slice(-4);
  },
  // Transaction ID masking - show first 8 and last 4 characters
  txId: (value: string) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 12) return "*".repeat(value.length);
    return value.slice(0, 8) + "*".repeat(Math.min(value.length - 12, 16)) + value.slice(-4);
  },
  // Password/secret masking - fully masked
  password: (value: string) => {
    if (!value || typeof value !== "string") return value;
    return "*".repeat(Math.min(value.length, 12));
  },
  // Account ID masking - show last 4 characters only
  accountId: (value: string) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 4) return "*".repeat(value.length);
    return "*".repeat(value.length - 4) + value.slice(-4);
  },
  // Script/hex data masking - show first 10 characters only
  script: (value: string) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 10) return "*".repeat(value.length);
    return value.slice(0, 10) + "..." + "*".repeat(8);
  },
  // Generic masking for other sensitive fields
  default: (value: string) => {
    if (!value || typeof value !== "string") return value;
    if (value.length <= 4) return "*".repeat(value.length);
    return value[0] + "*".repeat(Math.min(value.length - 2, 8)) + value[value.length - 1];
  },
};

/**
 * Gets the appropriate mask function based on field name
 */
function getMaskFunction(fieldName: string): (value: string) => string {
  const lowerField = fieldName.toLowerCase();
  if (lowerField.includes("email")) return MASK_PATTERNS.email;
  if (lowerField.includes("phone") || lowerField.includes("mobile")) return MASK_PATTERNS.phone;
  if (lowerField.includes("address") || lowerField.includes("walletaddress")) return MASK_PATTERNS.address;
  if (lowerField.includes("txid") || lowerField.includes("transactionid") || lowerField.includes("txhash")) return MASK_PATTERNS.txId;
  if (lowerField.includes("password") || lowerField.includes("secret") || lowerField.includes("key")) return MASK_PATTERNS.password;
  if (lowerField.includes("accountid") || lowerField.includes("account_id")) return MASK_PATTERNS.accountId;
  if (lowerField.includes("script")) return MASK_PATTERNS.script;
  if (lowerField.includes("broker")) return MASK_PATTERNS.default;
  return MASK_PATTERNS.default;
}

/**
 * Masks a value at a specific path in an object
 * Supports nested paths like "user.email" and array paths like "items.user.email"
 */
function maskAtPath(obj: any, pathParts: string[], fieldName: string): void {
  if (!obj || typeof obj !== "object" || pathParts.length === 0) return;

  const [current, ...rest] = pathParts;

  // Handle array case - current part is "items" or similar
  if (Array.isArray(obj)) {
    for (const item of obj) {
      maskAtPath(item, pathParts, fieldName);
    }
    return;
  }

  // Check if current key matches
  if (!(current in obj)) return;

  if (rest.length === 0) {
    // We're at the target field
    const value = obj[current];
    if (typeof value === "string") {
      const maskFn = getMaskFunction(fieldName);
      obj[current] = maskFn(value);
    }
  } else {
    // Continue traversing
    const next = obj[current];
    if (Array.isArray(next)) {
      for (const item of next) {
        maskAtPath(item, rest, fieldName);
      }
    } else if (next && typeof next === "object") {
      maskAtPath(next, rest, fieldName);
    }
  }
}

/**
 * Applies demo masking to a response object based on the provided mask paths
 *
 * @param data - The response data to mask
 * @param maskPaths - Array of dot-notation paths to mask (e.g., ["email", "user.email", "items.user.email"])
 * @returns The masked data (mutates the original object for performance)
 *
 * @example
 * const data = {
 *   items: [
 *     { user: { email: "test@example.com" } }
 *   ]
 * };
 * applyDemoMask(data, ["items.user.email"]);
 * // Result: { items: [{ user: { email: "t***t@****.com" } }] }
 */
export function applyDemoMask(data: any, maskPaths: string[]): any {
  // Only mask in demo mode
  if (!isDemo || !data || !maskPaths || maskPaths.length === 0) {
    return data;
  }

  // Handle the response structure - check if it has items array (pagination response)
  for (const path of maskPaths) {
    const parts = path.split(".");
    const fieldName = parts[parts.length - 1];

    // Handle top-level arrays
    if (Array.isArray(data)) {
      for (const item of data) {
        maskAtPath(item, parts, fieldName);
      }
    } else {
      maskAtPath(data, parts, fieldName);
    }
  }

  return data;
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return isDemo;
}
