export { StripeGateway } from "./StripeGateway";
export { PayPalGateway } from "./PayPalGateway";
export { AdyenGateway } from "./AdyenGateway";
export { KlarnaGateway } from "./KlarnaGateway";
export { PaytmGateway } from "./PaytmGateway";
export { PayFastGateway } from "./PayFastGateway";
export { PayUGateway } from "./PayUGateway";
export { IPay88Gateway } from "./IPay88Gateway";
export { AuthorizeNetGateway } from "./AuthorizeNetGateway";
export { TransfiGateway } from "./TransfiGateway";
export { RedirectGateway } from "./RedirectGateway";

export type { GatewayComponentProps, DepositResult } from "./types";
export { REDIRECT_GATEWAY_CONFIGS } from "./types";

/**
 * Gateway aliases that have dedicated components
 */
const DEDICATED_GATEWAYS = new Set([
  "stripe",
  "paypal",
  "adyen",
  "klarna",
  "paytm",
  "payfast",
  "payu",
  "ipay88",
  "authorizenet",
  "transfi",
]);

/**
 * Gateway aliases that use the generic RedirectGateway
 */
const REDIRECT_GATEWAYS = new Set([
  "2checkout",
  "mollie",
  "paystack",
  "paysafe",
  "dlocal",
  "eway",
]);

/**
 * Check if a gateway alias has a dedicated or redirect-based component
 */
export function isKnownGateway(alias: string): boolean {
  const normalized = alias?.toLowerCase();
  return DEDICATED_GATEWAYS.has(normalized) || REDIRECT_GATEWAYS.has(normalized);
}

/**
 * Check if a gateway alias uses the generic redirect component
 */
export function isRedirectGateway(alias: string): boolean {
  return REDIRECT_GATEWAYS.has(alias?.toLowerCase());
}

/**
 * Get the gateway type for display purposes
 */
export function getGatewayType(alias: string): string {
  const normalized = alias?.toLowerCase();
  if (normalized === "stripe") return "popup";
  if (normalized === "paypal") return "sdk";
  if (["adyen", "klarna", "paytm"].includes(normalized)) return "inline-sdk";
  if (normalized === "transfi") return "redirect";
  if (["payfast", "payu"].includes(normalized)) return "form-post";
  if (["ipay88", "authorizenet"].includes(normalized)) return "redirect";
  if (REDIRECT_GATEWAYS.has(normalized)) return "redirect";
  return "unknown";
}
