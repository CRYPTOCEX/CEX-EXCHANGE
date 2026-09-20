/**
 * The shapes `admin/finance/deposit/gateway/config` and
 * `.../gateway/[id]/config` return.
 *
 * Kept beside the pages rather than in a global types file because they are the
 * contract of two endpoints written for these two pages, and nothing else reads
 * them. They mirror `backend/src/utils/deposit-gateway/registry.ts` — when a
 * field is added there, add it here.
 */

export type CredentialKind = "secret" | "public" | "url" | "flag" | "text";

export interface GatewayCredential {
  key: string;
  label: string;
  /** Can the gateway TAKE a payment without it? Outbound leg only. */
  required: boolean;
  /**
   * Does the webhook that CREDITS the wallet refuse to run without it? Four
   * integrations refuse theirs on a credential `required` marks optional, so
   * the two flags are genuinely different questions.
   */
  inboundRequired?: boolean;
  kind: CredentialKind;
  why: string;
  example?: string;
  suggestedPath?: string;
  /** Which URL this is, on the gateways that declare several. */
  role?: "webhook" | "return" | "cancel";
}

export interface CredentialState extends GatewayCredential {
  set: boolean;
  /** Echoed only for values that are public by construction. Null otherwise. */
  value: string | null;
  /** Leading key-type marker of a secret ("sk_live"). Never the key itself. */
  prefix: string | null;
}

export interface GatewayGotcha {
  level: "info" | "warning" | "danger";
  title: string;
  body: string;
}

export interface GatewayProfile {
  alias: string;
  title: string;
  summary: string;
  regions: string;
  settlement: string;
  pricing: string;
  integration: "popup" | "sdk" | "inline-sdk" | "redirect" | "form-post";
  integrationNote: string;
  credentials: GatewayCredential[];
  sandboxKey?: string;
  modeNote: string;
  links: {
    signup?: string;
    dashboard?: string;
    apiKeys?: string;
    webhooks?: string;
    docs?: string;
  };
  webhookPath?: string;
  webhookEvents?: string[];
  webhookNote?: string;
  returnPath: string;
  steps: string[];
  gotchas: GatewayGotcha[];
  test: {
    mode: "live-probe" | "format-only";
    credentials: string[];
    note: string;
  };
}

export interface GatewayHealth {
  alias: string | null;
  supported: boolean;
  credentials: CredentialState[];
  missingRequired: string[];
  credentialsComplete: boolean;
  /** Keys the confirmation webhook refuses to run without, and does not have. */
  missingInbound: string[];
  /** Can the door that credits the wallet run? `null` — no webhook route. */
  inboundComplete: boolean | null;
  sandbox: boolean | null;
  mode: "test" | "live" | "unknown";
  webhookUrl: string | null;
  returnUrl: string;
  publicUrl: string;
}

/** One row of the list page. */
export interface GatewayListItem {
  id: string;
  name: string;
  title: string;
  description: string;
  image: string | null;
  alias: string | null;
  type: "FIAT" | "CRYPTO";
  status: boolean;
  version: string | null;
  currencies: string[];
  currencyCount: number;
  feeSummary: string;
  supported: boolean;
  credentialsComplete: boolean;
  missingRequired: string[];
  inboundComplete: boolean | null;
  missingInbound: string[];
  requiredCount: number;
  mode: "test" | "live" | "unknown";
  sandbox: boolean | null;
  hasWebhook: boolean;
  summary: string | null;
  regions: string | null;
}

export interface GatewayConfigResponse {
  publicUrl: string;
  gateways: GatewayListItem[];
  summary: {
    total: number;
    active: number;
    ready: number;
    needsCredentials: number;
    brokenActive: number;
    /** On, able to take a payment, and unable to confirm one. */
    cannotConfirm: number;
    unsupported: number;
    currencies: number;
  };
}

export interface GatewayDetailResponse {
  profile: GatewayProfile | null;
  health: GatewayHealth;
  unsupportedReason: string | null;
}

export interface CredentialTestResult {
  status: "valid" | "invalid" | "unknown" | "unsupported";
  message: string;
  environment?: "test" | "live";
}

/**
 * The single readiness verdict every surface renders from.
 *
 * Derived in one place because it is a FOUR-part question — is there an
 * integration, can it take a payment, can it confirm one, is the switch on —
 * and the list, the detail header and the KPI row were each one boolean away
 * from disagreeing with the other two.
 */
export type GatewayReadiness =
  | "live"
  | "cannot-confirm"
  | "ready-but-off"
  | "on-but-unconfigured"
  | "needs-credentials"
  | "unsupported";

export function readinessOf(gateway: {
  supported: boolean;
  status: boolean;
  credentialsComplete: boolean;
  /** Absent on callers that predate the inbound leg; absent is not "broken". */
  inboundComplete?: boolean | null;
}): GatewayReadiness {
  if (!gateway.supported) return "unsupported";
  if (!gateway.credentialsComplete) {
    return gateway.status ? "on-but-unconfigured" : "needs-credentials";
  }
  /*
   * ON, PAYABLE, AND DEAF. Ranked above "live" and only while the switch is on,
   * because that combination is the one where money moves: the customer is
   * charged at the vendor and the webhook that credits their wallet refuses to
   * run. Switched off it is ordinary unfinished setup, which "ready-but-off"
   * already says. `=== false` rather than falsy — `null` means the integration
   * has no webhook at all (Stripe, PayPal), which is not a fault.
   */
  if (gateway.status && gateway.inboundComplete === false) return "cannot-confirm";
  return gateway.status ? "live" : "ready-but-off";
}

export const READINESS_LABEL: Record<GatewayReadiness, string> = {
  live: "Accepting deposits",
  "cannot-confirm": "Takes payments, cannot confirm them",
  "ready-but-off": "Configured, switched off",
  "on-but-unconfigured": "On, but cannot authenticate",
  "needs-credentials": "Credentials needed",
  unsupported: "No integration",
};

/**
 * R2: status colour never travels alone. Every consumer of this map pairs the
 * tone with the label above and an icon, so the state survives both themes and
 * a red/green colour-vision deficiency.
 */
export const READINESS_TONE: Record<
  GatewayReadiness,
  "success" | "neutral" | "destructive" | "warning"
> = {
  live: "success",
  "cannot-confirm": "destructive",
  "ready-but-off": "neutral",
  "on-but-unconfigured": "destructive",
  "needs-credentials": "warning",
  unsupported: "neutral",
};
