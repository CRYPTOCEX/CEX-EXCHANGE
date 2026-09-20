import {
  Eye,
  FileText,
  Globe,
  MapPin,
  ScrollText,
  ShieldAlert,
} from "lucide-react";
import type {
  FieldDefinition,
  TabColors,
  TabDefinition,
} from "@/components/admin/settings";

/**
 * Field definitions for the geographic restriction policy.
 *
 * Keys are the real setting keys, so values round-trip straight between the
 * GET and the PUT with no mapping layer.
 *
 * The descriptions carry more weight here than on a normal settings screen:
 * an operator setting up a compliance control needs to know what each switch
 * does to real customers, and "fail open" or "block unknown countries" are not
 * self-explanatory to someone who did not write the engine.
 */

export const GEO_TABS: TabDefinition[] = [
  {
    id: "enforcement",
    label: "Enforcement",
    icon: ShieldAlert,
    description: "Whether restrictions apply, and how strictly",
  },
  {
    id: "detection",
    label: "Detection",
    icon: MapPin,
    description: "How a visitor's country is determined",
  },
  {
    id: "exceptions",
    label: "Exceptions",
    icon: Globe,
    description: "Who is never blocked, and who always is",
  },
  {
    id: "notice",
    label: "Notice",
    icon: FileText,
    description: "What a restricted visitor is shown",
  },
  {
    id: "audit",
    label: "Audit log",
    icon: ScrollText,
    description: "What is recorded, and for how long",
  },
];

export const GEO_TAB_COLORS: Record<string, TabColors> = {
  enforcement: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
    iconBg: "bg-chart-1",
  },
  detection: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
    iconBg: "bg-chart-2",
  },
  exceptions: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
    iconBg: "bg-chart-3",
  },
  notice: {
    bg: "bg-chart-4/10",
    text: "text-chart-4",
    border: "border-chart-4/20",
    iconBg: "bg-chart-4",
  },
  audit: {
    bg: "bg-chart-5/10",
    text: "text-chart-5",
    border: "border-chart-5/20",
    iconBg: "bg-chart-5",
  },
};

export const GEO_FIELD_DEFINITIONS: FieldDefinition[] = [
  // ── Enforcement ─────────────────────────────────────────────────────────
  {
    key: "geoRestrictionEnabled",
    label: "Enforce geographic restrictions",
    type: "switch",
    category: "enforcement",
    subcategory: "Master switch",
    description:
      "Master switch. While this is off, the country rules are stored but nothing is blocked. Only a Super Admin can switch it back off once enabled.",
  },
  {
    key: "geoRestrictionMode",
    label: "Policy mode",
    type: "select",
    category: "enforcement",
    subcategory: "Master switch",
    description:
      "Blocklist: everyone is allowed except the countries you list. Allowlist: everyone is blocked except the countries you list — use this only if you serve a small, fixed set of markets.",
    options: [
      { value: "BLOCKLIST", label: "Blocklist — allow all except listed" },
      { value: "ALLOWLIST", label: "Allowlist — block all except listed" },
    ],
  },
  {
    key: "geoRestrictionAllowAccountExit",
    label: "Allow existing users to withdraw and close out",
    type: "switch",
    category: "enforcement",
    subcategory: "Existing customers",
    description:
      "Strongly recommended. Restricted users can still sign in, complete verification, contact support and withdraw their balance — but cannot register, deposit or take on new positions. Turning this off traps existing customers' funds behind the restriction.",
  },
  {
    key: "geoRestrictionBlockUnknownCountry",
    label: "Block when the country cannot be determined",
    type: "switch",
    category: "enforcement",
    subcategory: "Uncertainty",
    description:
      "Fail-closed for unidentifiable visitors. Only enable this if you have a CDN that supplies a country header, or an IP lookup provider configured — otherwise it will block legitimate traffic.",
  },
  {
    key: "geoRestrictionFailOpen",
    label: "Allow access if the geo engine itself fails",
    type: "switch",
    category: "enforcement",
    subcategory: "Uncertainty",
    description:
      "What to do when the rules cannot be read at all (database outage at start-up, for example). On: serve the request. Off: refuse it. Leave this on unless you are under a hard sanctions obligation where an over-serve is worse than an outage.",
  },

  // ── Detection ───────────────────────────────────────────────────────────
  {
    key: "geoRestrictionTrustCdnHeaders",
    label: "Use CDN country headers",
    type: "switch",
    category: "detection",
    subcategory: "Network",
    description:
      "Reads the country your edge already determined (Cloudflare cf-ipcountry, CloudFront, Vercel, Fastly, or an nginx GeoIP header). Free, instant, and cannot be forged by the visitor. Leave on.",
  },
  {
    key: "geoRestrictionLookupProvider",
    label: "IP geolocation provider",
    type: "select",
    category: "detection",
    subcategory: "Network",
    description:
      "Fallback used when no CDN header is present. Results are cached, so a busy site makes very few calls. Note: the first request from a brand-new IP resolves while the lookup warms up, so it is treated as an unknown country.",
    options: [
      { value: "NONE", label: "None — CDN headers only" },
      { value: "IP_API", label: "ip-api.com (free tier, no key needed)" },
      { value: "IPINFO", label: "ipinfo.io (token required)" },
      { value: "IPAPI_CO", label: "ipapi.co" },
    ],
  },
  {
    key: "geoRestrictionLookupApiKey",
    label: "Provider API key",
    type: "input",
    inputType: "password",
    category: "detection",
    subcategory: "Network",
    placeholder: "Leave blank to keep the current key",
    description:
      "Required for ipinfo.io, optional for the others. Stored server-side and never sent back to the browser — leaving this blank keeps whatever is already saved.",
    showIf: (values) => values.geoRestrictionLookupProvider !== "NONE",
  },
  {
    key: "geoRestrictionLookupCacheTtl",
    label: "Lookup cache lifetime",
    type: "number",
    category: "detection",
    subcategory: "Network",
    suffix: "sec",
    min: 300,
    max: 2592000,
    description:
      "How long a resolved IP → country result is reused. An IP's country rarely changes, so a long lifetime (24 hours is the default) mostly saves provider quota.",
    showIf: (values) => values.geoRestrictionLookupProvider !== "NONE",
  },
  {
    key: "geoRestrictionBlockAnonymizedIps",
    label: "Block VPN, proxy and Tor connections",
    type: "switch",
    category: "detection",
    subcategory: "Evasion",
    description:
      "Refuses connections the provider flags as anonymising. Effective against casual evasion, but datacenter IPs and corporate VPNs are flagged too — expect some false positives. Requires a provider that reports these flags (ip-api or ipinfo).",
  },
  {
    key: "geoRestrictionTrustKycCountry",
    label: "Use the country on approved identity documents",
    type: "switch",
    category: "detection",
    subcategory: "Identity",
    description:
      "The strongest signal available: a verified customer's own documents. This is what stops a restricted user simply switching on a VPN, and equally stops a permitted user being blocked while travelling.",
  },
  {
    key: "geoRestrictionTrustProfileCountry",
    label: "Use the country on the user's profile",
    type: "switch",
    category: "detection",
    subcategory: "Identity",
    description:
      "Self-declared and freely editable, so it is evidence of intent rather than of location. Off by default; enable only if you want a stated country to be enough to restrict someone.",
  },

  // ── Exceptions ──────────────────────────────────────────────────────────
  {
    key: "geoRestrictionAdminBypass",
    label: "Administrators are never blocked",
    type: "switch",
    category: "exceptions",
    subcategory: "Staff",
    description:
      "Keep this on. Without it, an administrator who restricts their own country locks themselves out of the panel needed to undo it.",
  },
  {
    key: "geoRestrictionIpAllowlist",
    label: "Always-allowed IP addresses",
    type: "textarea",
    category: "exceptions",
    subcategory: "Networks",
    fullWidth: true,
    placeholder: "203.0.113.4\n198.51.100.0/24\n2001:db8::/32",
    description:
      "One address or CIDR range per line. Checked before every other rule, so these can always reach the platform. Add your office and monitoring IPs here before enabling enforcement — this is the escape hatch if a rule goes wrong.",
  },
  {
    key: "geoRestrictionIpBlocklist",
    label: "Always-blocked IP addresses",
    type: "textarea",
    category: "exceptions",
    subcategory: "Networks",
    fullWidth: true,
    placeholder: "203.0.113.66\n198.51.100.128/25",
    description:
      "One address or CIDR range per line. Refused regardless of country. Use sparingly — this is a blunt instrument, and addresses get reassigned.",
  },

  // ── Notice ──────────────────────────────────────────────────────────────
  {
    key: "geoRestrictionNoticeTitle",
    label: "Notice heading",
    type: "text",
    category: "notice",
    subcategory: "Wording",
    placeholder: "Service not available in your region",
    description: "Shown as the heading on the restriction page.",
  },
  {
    key: "geoRestrictionNoticeMessage",
    label: "Notice message",
    type: "textarea",
    category: "notice",
    subcategory: "Wording",
    fullWidth: true,
    placeholder:
      "Leave blank to use the default wording, which names the detected country.",
    description:
      "The explanation shown to restricted visitors, and the message returned by the API. Have your legal team word this — it is the customer-facing statement of your position. Leave blank for the neutral default.",
  },
  {
    key: "geoRestrictionContactEmail",
    label: "Contact address",
    type: "input",
    inputType: "email",
    category: "notice",
    subcategory: "Wording",
    placeholder: "compliance@example.com",
    description:
      "Offered to restricted visitors who believe the determination is wrong. Leave blank to show no contact route.",
  },

  // ── Audit ───────────────────────────────────────────────────────────────
  {
    key: "geoRestrictionLogMode",
    label: "What to record",
    type: "select",
    category: "audit",
    subcategory: "Recording",
    description:
      "Blocked-only is the sensible default: it captures the refusals and bypasses you would need to evidence, without logging every ordinary request. 'Everything' is for short investigations, not for permanent use.",
    options: [
      { value: "BLOCKED", label: "Blocked and bypassed decisions only" },
      { value: "ALL", label: "Every decision (high volume)" },
      { value: "NONE", label: "Nothing" },
    ],
  },
  {
    key: "geoRestrictionLogDedupeSeconds",
    label: "Collapse repeats within",
    type: "number",
    category: "audit",
    subcategory: "Recording",
    suffix: "sec",
    min: 0,
    max: 86400,
    description:
      "Repeat decisions from the same address are counted on one entry instead of creating new ones. Stops a blocked crawler from filling the log. Set to 0 to record every single decision separately.",
  },
  {
    key: "geoRestrictionLogRetentionDays",
    label: "Keep entries for",
    type: "number",
    category: "audit",
    subcategory: "Retention",
    suffix: "days",
    min: 0,
    max: 3650,
    description:
      "Older entries are removed nightly. Set to 0 to keep them indefinitely. Check what your jurisdiction requires before shortening this — this log is the evidence that restricted traffic was actually turned away.",
  },
];

export const GEO_DEFAULT_SETTINGS: Record<string, any> = {
  geoRestrictionEnabled: "false",
  geoRestrictionMode: "BLOCKLIST",
  geoRestrictionAllowAccountExit: "true",
  geoRestrictionBlockUnknownCountry: "false",
  geoRestrictionFailOpen: "true",
  geoRestrictionAdminBypass: "true",
  geoRestrictionIpAllowlist: "",
  geoRestrictionIpBlocklist: "",
  geoRestrictionLookupProvider: "NONE",
  geoRestrictionLookupApiKey: "",
  geoRestrictionLookupCacheTtl: "86400",
  geoRestrictionTrustCdnHeaders: "true",
  geoRestrictionTrustKycCountry: "true",
  geoRestrictionTrustProfileCountry: "false",
  geoRestrictionBlockAnonymizedIps: "false",
  geoRestrictionLogMode: "BLOCKED",
  geoRestrictionLogRetentionDays: "365",
  geoRestrictionLogDedupeSeconds: "300",
  geoRestrictionNoticeTitle: "",
  geoRestrictionNoticeMessage: "",
  geoRestrictionContactEmail: "",
};

export const GEO_TAB_ICONS: Record<string, React.ElementType> = {
  enforcement: ShieldAlert,
  detection: MapPin,
  exceptions: Globe,
  notice: Eye,
  audit: ScrollText,
};
