import { NAV_COLOR_SCHEMAS } from "@/lib/nav-color-schema";

/**
 * Six flat entries was one too many for the bar, and it also hid three real
 * pages: `/gateway/docs`, and the API-key and webhook panels inside settings
 * were reachable only from a button on the dashboard.
 *
 * Grouped by what the reader came to do — money in and out under Transactions,
 * everything a developer needs under Developers — which puts the bar back to
 * five and surfaces the hidden pages instead of adding more to the top row.
 *
 * A parent with `child` and no `href` renders as a dropdown and is not itself a
 * link (see `NavItem` in `components/partials/header/site-header.tsx`), so the
 * two group headers deliberately have no destination.
 *
 * Keys are the translation path — dashes become dots and `nav.<key>.title` is
 * looked up in `ext_gateway.<locale>.json` — so the six existing keys are kept
 * verbatim and the new ones are single words rather than `api-keys`, which
 * would have to be nested as `nav.api.keys.title`. A key with no translation
 * falls back to `title`, so the other 89 locales still read correctly.
 */
export const menu: MenuItem[] = [
  {
    key: "gateway",
    title: "Gateway",
    href: "/gateway",
    icon: "lucide:home",
    exact: true,
    description:
      "Professional payment gateway for merchants to accept cryptocurrency payments with seamless integration.",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/gateway/dashboard",
    icon: "lucide:layout-dashboard",
    description:
      "Merchant dashboard with transaction analytics, payment tracking, and API management tools.",
  },
  {
    key: "transactions",
    title: "Transactions",
    icon: "lucide:arrow-left-right",
    description: "Money in and money out — payment history and merchant payouts.",
    child: [
      {
        key: "payments",
        title: "Payments",
        href: "/gateway/payment",
        icon: "lucide:credit-card",
        description:
          "Complete payment transaction history with status tracking and reconciliation tools.",
      },
      {
        key: "payouts",
        title: "Payouts",
        href: "/gateway/payouts",
        icon: "lucide:wallet",
        description:
          "Manage withdrawal requests and track payout history with automated processing.",
      },
    ],
  },
  {
    key: "developers",
    title: "Developers",
    icon: "lucide:code",
    description: "Keys, webhooks, SDKs and the full API reference.",
    child: [
      {
        key: "integrations",
        title: "Integrations",
        href: "/gateway/integration",
        icon: "lucide:puzzle",
        description:
          "Plugins and step-by-step setup guides for the platforms you already sell on.",
      },
      {
        key: "docs",
        title: "API Reference",
        href: "/gateway/docs",
        icon: "lucide:book-open",
        description:
          "Endpoints, authentication, error codes and webhook payloads, with copyable examples.",
      },
      {
        key: "keys",
        title: "API Keys",
        href: "/gateway/settings?tab=api-keys",
        icon: "lucide:key-round",
        description:
          "Issue, rotate and revoke the test and live key pairs your integration signs with.",
      },
      {
        key: "webhooks",
        title: "Webhooks",
        href: "/gateway/settings?tab=webhooks",
        icon: "lucide:webhook",
        description:
          "Point an endpoint at your server and review delivery attempts for every event.",
      },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    href: "/gateway/settings",
    icon: "lucide:settings",
    description:
      "Configure gateway preferences, webhook endpoints, and notification settings.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.gateway;
export const adminPath = "/admin/gateway";
