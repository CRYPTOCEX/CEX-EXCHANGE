export type FieldType =
  | "switch"
  | "text"
  | "input"
  | "number"
  | "range"
  | "url"
  | "select"
  | "file"
  | "mlm"
  | "socialLinks"
  | "custom";

// Social link structure for custom social links
export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string; // URL to icon image
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  options?: { label: string; value: string }[];
  category: string;
  subcategory?: string;
  showIf?: (values: Record<string, string>) => boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string; // e.g., "%" for percentages, "min" for minutes
  placeholder?: string; // Custom placeholder text for input fields
  inputType?: "text" | "number" | "email" | "password" | "url"; // HTML input type override
  fileSize?: { width: number; height: number };
  preview?: Record<string, Record<string, string>>;
  fullWidth?: boolean; // Whether this field should span the full width in grid layouts
  // Optional addon module path that must be available for this field to show
  // e.g., "@/components/(ext)/chart-engine" - field will be hidden if addon is not installed
  addonRequired?: string;
}

export const TABS = [
  { id: "general", label: "General" },
  { id: "features", label: "Features" },
  { id: "security", label: "Security" },
  { id: "wallet", label: "Wallet" },
  { id: "social", label: "Social & Links" },
  { id: "logos", label: "Branding" },
];

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // ========================================
  // GENERAL SETTINGS
  // ========================================

  // Appearance
  {
    key: "siteTheme",
    label: "Default Site Theme",
    type: "select",
    description:
      "Set the default theme for the entire site (light, dark, or follow system preference)",
    category: "general",
    subcategory: "Appearance",
    options: [
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
      { label: "System (Follow OS preference)", value: "system" },
    ],
  },
  {
    key: "layoutSwitcher",
    label: "Theme Switcher",
    type: "switch",
    description: "Allow users to switch between light and dark themes",
    category: "general",
    subcategory: "Appearance",
  },
  {
    key: "navbarLogoDisplay",
    label: "Navbar Logo Display",
    type: "select",
    description: "Choose how to display the logo in navigation bars",
    category: "general",
    subcategory: "Appearance",
    options: [
      { label: "Square Logo + Site Name", value: "SQUARE_WITH_NAME" },
      { label: "Full Logo Only", value: "FULL_LOGO_ONLY" },
    ],
  },

  // Landing Page
  {
    key: "landingPageType",
    label: "Landing Page Type",
    type: "select",
    description: "Choose the landing page to display for users.",
    category: "general",
    subcategory: "Landing Page",
    options: [
      { label: "Default", value: "DEFAULT" },
      { label: "Custom", value: "CUSTOM" },
    ],
  },

  // Content
  {
    key: "newsStatus",
    label: "News Section",
    type: "switch",
    description: "Enable news section on the platform",
    category: "general",
    subcategory: "Content",
  },

  // Trust
  {
    key: "verificationBadge",
    label: "Registry Verification Badge",
    type: "switch",
    description:
      "Show a verification badge in the public site footer, linking to your entry in the deployment registry. The badge is served by the registry, so it adds no load to your server. Off by default.",
    category: "general",
    subcategory: "Trust",
  },

  // Support
  {
    key: "floatingLiveChat",
    label: "Floating Live Chat",
    type: "switch",
    description: "Show floating live chat button for customer support",
    category: "general",
    subcategory: "Support",
  },

  // Addon Branding
  {
    key: "addon_aliases",
    label: "Addon Display Names",
    type: "custom",
    description:
      "Customize the display names of addons as they appear in the frontend navigation and menus",
    category: "general",
    subcategory: "Addon Branding",
    fullWidth: true,
  },

  // ========================================
  // SECURITY SETTINGS
  // ========================================

  // Authentication
  {
    key: "googleAuthStatus",
    label: "Google OAuth Login",
    type: "switch",
    description: "Allow users to sign in with Google accounts",
    category: "security",
    subcategory: "Authentication",
  },
  {
    key: "verifyEmailStatus",
    label: "Email Verification Required",
    type: "switch",
    description: "Require users to verify their email address after registration",
    category: "security",
    subcategory: "Authentication",
  },

  // Two-Factor Authentication
  {
    key: "twoFactorStatus",
    label: "Two-Factor Authentication",
    type: "switch",
    description: "Enable two-factor authentication (2FA) for enhanced account security",
    category: "security",
    subcategory: "Two-Factor Authentication",
  },
  {
    key: "twoFactorSmsStatus",
    label: "SMS 2FA",
    type: "switch",
    description: "Allow SMS-based two-factor authentication",
    category: "security",
    subcategory: "Two-Factor Authentication",
    showIf: (values) => {
      const val = values.twoFactorStatus;
      return val === "true" || (typeof val === 'boolean' && val === true);
    },
  },
  {
    key: "twoFactorEmailStatus",
    label: "Email 2FA",
    type: "switch",
    description: "Allow email-based two-factor authentication",
    category: "security",
    subcategory: "Two-Factor Authentication",
    showIf: (values) => {
      const val = values.twoFactorStatus;
      return val === "true" || (typeof val === 'boolean' && val === true);
    },
  },
  {
    key: "twoFactorAppStatus",
    label: "Authenticator App 2FA",
    type: "switch",
    description: "Allow authenticator app-based two-factor authentication (TOTP)",
    category: "security",
    subcategory: "Two-Factor Authentication",
    showIf: (values) => {
      const val = values.twoFactorStatus;
      return val === "true" || (typeof val === 'boolean' && val === true);
    },
  },

  // Withdrawal Security
  //
  // Two independent controls, both OFF by default:
  //   withdrawTwoFactorRequired  — no withdrawal at all without an enrolled,
  //                                accepted 2FA method
  //   withdrawTwoFactorChallenge — every withdrawal must be confirmed with a
  //                                fresh one-time code
  // Both are ignored while platform-wide 2FA is off, so turning them on can
  // never lock the whole user base out of their funds.
  {
    key: "withdrawTwoFactorRequired",
    label: "Require 2FA to Withdraw",
    type: "switch",
    description:
      "Block withdrawals for users who do not have an accepted two-factor method enabled. Ignored while Two-Factor Authentication is off platform-wide. Changing this requires a Super Admin account.",
    category: "security",
    subcategory: "Withdrawal Security",
    showIf: (values) => {
      const val = values.twoFactorStatus;
      return val === "true" || (typeof val === "boolean" && val === true);
    },
  },
  {
    key: "withdrawTwoFactorChallenge",
    label: "Verify 2FA on Every Withdrawal",
    type: "switch",
    description:
      "Ask for a fresh one-time code each time a withdrawal is submitted, confirming the request comes from the account holder and not a hijacked session. Changing this requires a Super Admin account.",
    category: "security",
    subcategory: "Withdrawal Security",
    showIf: (values) => {
      const val = values.twoFactorStatus;
      return val === "true" || (typeof val === "boolean" && val === true);
    },
  },
  {
    key: "withdrawTwoFactorAppAllowed",
    label: "Accept Authenticator App",
    type: "switch",
    description:
      "Allow authenticator app (TOTP) 2FA to satisfy the withdrawal requirement. This is the strongest of the three methods.",
    category: "security",
    subcategory: "Withdrawal Security",
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("twoFactorStatus") &&
        enabled("twoFactorAppStatus") &&
        (enabled("withdrawTwoFactorRequired") ||
          enabled("withdrawTwoFactorChallenge"))
      );
    },
  },
  {
    key: "withdrawTwoFactorEmailAllowed",
    label: "Accept Email 2FA",
    type: "switch",
    description:
      "Allow email-based 2FA to satisfy the withdrawal requirement. Weaker than an authenticator app — a compromised inbox also compromises the withdrawal.",
    category: "security",
    subcategory: "Withdrawal Security",
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("twoFactorStatus") &&
        enabled("twoFactorEmailStatus") &&
        (enabled("withdrawTwoFactorRequired") ||
          enabled("withdrawTwoFactorChallenge"))
      );
    },
  },
  {
    key: "withdrawTwoFactorSmsAllowed",
    label: "Accept SMS 2FA",
    type: "switch",
    description:
      "Allow SMS-based 2FA to satisfy the withdrawal requirement. Requires a provider that can send one-time codes — Twilio, or MSG91 with SMS_OTP_PROVIDER set to 'msg91'. With neither configured, SMS cannot satisfy the requirement and this switch is ignored.",
    category: "security",
    subcategory: "Withdrawal Security",
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("twoFactorStatus") &&
        enabled("twoFactorSmsStatus") &&
        (enabled("withdrawTwoFactorRequired") ||
          enabled("withdrawTwoFactorChallenge"))
      );
    },
  },

  // Wallet linking
  //
  // Removing a linked Web3 address is what makes that address available to be
  // linked by somebody else, so the disconnect door is a security boundary and
  // not merely a convenience. The route has always been able to demand a fresh
  // SIWE signature before unlinking, and read this key to decide — but the key
  // had no control on any screen, so it could only ever be created by a direct
  // settings PUT or a database write. The control is off by default, which is
  // the behaviour every install has had; this makes it reachable.
  {
    key: "walletDisconnectRequiresSignature",
    label: "Require a signature to unlink a wallet",
    type: "switch",
    description:
      "Ask for a fresh signature from the linked address before it is unlinked. The disconnect route is already session-scoped, so this is defence in depth: it stops a hijacked session from freeing an address for someone else to claim. Users who no longer control the key cannot unlink it themselves while this is on.",
    category: "security",
    subcategory: "Wallet Linking",
  },

  // Transfer Security
  //
  // Two independent controls, both OFF by default, guarding the transfer doors:
  //   transferPinRequired         a four-digit Transfer PIN must approve a transfer
  //   transferTwoFactorChallenge  a fresh one-time code must approve a transfer
  //
  // Turning on exactly one selects that mechanism. Turning on BOTH means EITHER
  // satisfies — two acceptable credentials, not two prompts — so a user with no
  // signal can fall back to their PIN and a user who forgot their PIN can fall
  // back to a code.
  //
  // The 2FA half is ignored while platform-wide 2FA is off, exactly like the
  // withdrawal switches above, so it can never lock the user base out. The PIN
  // half is NOT ignored when a user has no PIN: setting one needs no platform
  // configuration at all, so "not set up yet" is the setup step, and the user is
  // told to go and do it.
  {
    key: "transferPinRequired",
    label: "Require Transfer PIN",
    type: "switch",
    description:
      "Ask for the user's four-digit Transfer PIN before a transfer is accepted. Users who have not set one are told to set one — a PIN needs no platform configuration, so this requirement always applies. Changing this requires a Super Admin account.",
    category: "security",
    subcategory: "Transfer Security",
  },
  {
    key: "transferTwoFactorChallenge",
    label: "Verify 2FA on Every Transfer",
    type: "switch",
    description:
      "Ask for a fresh one-time code each time a transfer is submitted, confirming the request comes from the account holder and not a hijacked session. Ignored while Two-Factor Authentication is off platform-wide. Changing this requires a Super Admin account.",
    category: "security",
    subcategory: "Transfer Security",
    showIf: (values) => {
      const val = values.twoFactorStatus;
      return val === "true" || (typeof val === "boolean" && val === true);
    },
  },
  {
    key: "transferSecurityScope",
    label: "Apply Transfer Verification To",
    type: "select",
    description:
      "Transfers to another user are irreversible — the recipient can withdraw immediately — which is what this protection is for. Moves between a user's own wallet types keep the money in the account, and the doors it could leave through afterwards carry their own verification, so they are exempt by default. Changing this requires a Super Admin account.",
    category: "security",
    subcategory: "Transfer Security",
    options: [
      { label: "Transfers to another user only (recommended)", value: "client" },
      { label: "All transfers, including between a user's own wallets", value: "all" },
    ],
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("transferPinRequired") || enabled("transferTwoFactorChallenge")
      );
    },
  },
  {
    key: "transferTwoFactorAppAllowed",
    label: "Accept Authenticator App",
    type: "switch",
    description:
      "Allow authenticator app (TOTP) 2FA to confirm a transfer. This is the strongest of the three methods.",
    category: "security",
    subcategory: "Transfer Security",
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("twoFactorStatus") &&
        enabled("twoFactorAppStatus") &&
        enabled("transferTwoFactorChallenge")
      );
    },
  },
  {
    key: "transferTwoFactorEmailAllowed",
    label: "Accept Email 2FA",
    type: "switch",
    description:
      "Allow email-based 2FA to confirm a transfer. Weaker than an authenticator app — a compromised inbox also compromises the transfer.",
    category: "security",
    subcategory: "Transfer Security",
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("twoFactorStatus") &&
        enabled("twoFactorEmailStatus") &&
        enabled("transferTwoFactorChallenge")
      );
    },
  },
  {
    key: "transferTwoFactorSmsAllowed",
    label: "Accept SMS 2FA",
    type: "switch",
    description:
      "Allow SMS-based 2FA to confirm a transfer. Requires a provider that can send one-time codes — Twilio, or MSG91 with SMS_OTP_PROVIDER set to 'msg91'. With neither configured, SMS cannot satisfy the requirement and this switch is ignored.",
    category: "security",
    subcategory: "Transfer Security",
    showIf: (values) => {
      const enabled = (key: string) => {
        const val = values[key];
        return val === "true" || (typeof val === "boolean" && val === true);
      };
      return (
        enabled("twoFactorStatus") &&
        enabled("twoFactorSmsStatus") &&
        enabled("transferTwoFactorChallenge")
      );
    },
  },

  // Protection
  //
  // `captchaProvider` replaced the old `powCaptchaStatus` switch. The switch is
  // gone from this screen but the KEY is still honoured by the backend
  // (utils/captcha/config.ts): an install that explicitly turned PoW off keeps
  // that choice across the upgrade instead of silently coming back on.
  {
    key: "captchaProvider",
    label: "Captcha Provider",
    type: "select",
    description:
      "Which captcha guards registration, login and password reset. Proof-of-Work needs no account or keys but only imposes a CPU cost — it cannot tell a human from a script. Turnstile is free, invisible and the recommended choice.",
    category: "security",
    subcategory: "Protection",
    options: [
      { label: "Cloudflare Turnstile (recommended)", value: "turnstile" },
      { label: "Google reCAPTCHA v3", value: "recaptcha" },
      { label: "hCaptcha", value: "hcaptcha" },
      { label: "Proof of Work (built-in, no keys)", value: "pow" },
      { label: "None — no captcha at all", value: "none" },
    ],
  },
  {
    key: "captchaSiteKey",
    label: "Site Key",
    type: "text",
    description:
      "Public key for the selected provider. Rendered into the page, so it is not a secret. Turnstile: dash.cloudflare.com → Turnstile. reCAPTCHA: google.com/recaptcha/admin (create a v3 key). hCaptcha: dashboard.hcaptcha.com.",
    category: "security",
    subcategory: "Protection",
    placeholder: "0x4AAAAAAA...",
    showIf: (values: Record<string, string>) =>
      ["turnstile", "recaptcha", "hcaptcha"].includes(
        String(values.captchaProvider ?? "")
      ),
  },
  {
    key: "captchaSecretKey",
    label: "Secret Key",
    type: "text",
    inputType: "password",
    description:
      "Server-side key used to verify tokens with the provider. Never sent to the browser. Super Admin only.",
    category: "security",
    subcategory: "Protection",
    placeholder: "0x4AAAAAAA...",
    showIf: (values: Record<string, string>) =>
      ["turnstile", "recaptcha", "hcaptcha"].includes(
        String(values.captchaProvider ?? "")
      ),
  },
  {
    key: "captchaScoreThreshold",
    label: "reCAPTCHA Score Threshold",
    type: "range",
    min: 0,
    max: 1,
    step: 0.1,
    description:
      "reCAPTCHA v3 never fails — it grades 0.0 (bot) to 1.0 (human). Requests scoring BELOW this are refused. 0.5 is Google's own starting point; raise it if bots get through, lower it if real users are blocked.",
    category: "security",
    subcategory: "Protection",
    showIf: (values: Record<string, string>) =>
      String(values.captchaProvider ?? "") === "recaptcha",
  },
  {
    key: "powCaptchaDifficulty",
    label: "PoW Difficulty",
    type: "select",
    description:
      "How much CPU a proof-of-work solve costs. Note this does NOT change the attacker/user ratio — both sides scale identically — so raising it slows your real users far more than it slows a bot. High times out on many phones.",
    category: "security",
    subcategory: "Protection",
    options: [
      { label: "Low (Fast, ~100ms)", value: "low" },
      { label: "Medium (Balanced, ~500ms)", value: "medium" },
      { label: "High (Secure, ~2s)", value: "high" },
    ],
    showIf: (values: Record<string, string>) =>
      String(values.captchaProvider ?? "") === "pow",
  },

  // ========================================
  // INTEGRATIONS SETTINGS — NONE, AND THE TAB IS GONE WITH THEM
  // ========================================
  //
  // `googleAnalyticsStatus` and `facebookPixelStatus` lived here as switches
  // reading "Enable Google Analytics tracking" / "Enable Facebook Pixel
  // tracking". Neither loaded anything. There is no `gtag`, no
  // `googletagmanager`, no `fbq` and no `next/script` ANYWHERE in this
  // frontend, there was no field to enter a measurement or pixel id, and the
  // two keys had no reader outside this file. An operator who turned Google
  // Analytics on and waited for traffic to appear was waiting on nothing.
  //
  // They were the only two fields in the `integrations` category, so the tab
  // went with them (`TABS` above, plus `TAB_ICONS`/`TAB_DESCRIPTIONS` in
  // `admin/system/settings/page.tsx`). Same reasoning as `forexInvestment` and
  // the twelve `*Restrictions` keys below: a control that reports a capability
  // the software does not have is worse than a missing one.

  // ========================================
  // FEATURES SETTINGS
  // ========================================

  // Note: Spot Trading is now managed in Trading Settings page (/admin/trading/settings)
  // Note: Blog Settings are now managed in Blog Settings page (/admin/blog/settings)
  // Note: Binary Settings are now managed in Binary Settings page (/admin/finance/binary/settings)

  // Investment
  {
    key: "investment",
    label: "Investment",
    type: "switch",
    description: "Enable investment features",
    category: "features",
    subcategory: "Investment",
  },

  // User Verification
  {
    key: "kycStatus",
    label: "KYC Verification",
    type: "switch",
    description: "Enable KYC verification for users",
    category: "features",
    subcategory: "Verification",
  },
  {
    key: "kycFeatureEnforcement",
    label: "Enforce KYC Feature Access",
    type: "switch",
    description:
      "Enforce the per-feature switches configured on each KYC level. Off by default: turn this on only after reviewing every level in the KYC level builder, because users whose level does not list a feature will be refused that action.",
    category: "features",
    subcategory: "Verification",
  },

  // Web3 Trading (internal extension key: `dex`)
  //
  // ONE key, and the count has been wrong here twice — an earlier comment said
  // "these four" above a list of three, and the list that replaced it said
  // "three" while two of the three had grown a second editor elsewhere. The
  // arithmetic is load-bearing in a way a stale number usually is not, so: ONE.
  //
  // WHY ONLY `dexEnabled` IS HERE, AND WHY IT IS AN EXCEPTION RATHER THAN A RULE
  //
  // `PROTECTED_SETTING_KEYS` protects FIVE `dex*` keys, and all five have a field
  // in the DEX console (frontend/app/[locale]/(ext)/admin/dex/settings), which
  // resolves the Super Admin role server-side per request. That console is where
  // they belong: it groups them into tabs, gates the screening fields on the
  // screening switch, and — the part this page cannot do — its PUT runs
  // `validateDexSettingsPatch` over every value.
  //
  // The generic settings PUT behind THIS page runs no per-key value validation
  // at all. It stringifies, length-checks, gates on the protected list and
  // writes. `dexAllowlistMode` had a field here as well, so the same row had two
  // editors and only one of them checked that the value was a mode the reader
  // understands. That is the shape of a defect, not a convenience: the failure of
  // an unrecognised allowlist mode is a user swapping into a token nobody
  // curated, and a swap is irreversible. `dexAllowlistMode` and `dexKycRequired`
  // are gone from this page, and the core PUT now REFUSES them by name with a
  // pointer to the console — the same treatment the geo-restriction keys get, for
  // the same reason.
  //
  // `dexEnabled` stays, and cannot move: `requireDexEnabled()` runs at the top of
  // the DEX settings handler, so that console 503s while the switch is off and
  // can never be the screen that turns it on. A control whose only home is behind
  // itself has no home. The console renders it read-only for the same reason.
  //
  // The other 66 keys in `DEX_SETTINGS_KEYS` (slippage bounds, timeouts,
  // screening, poller, geo list, direct-pool thresholds, the pool indexer) were
  // never duplicated here, and `dexDirectPoolsEnabled`/`dexPoolRiskAckRequired`
  // are the reason to state that carefully rather than smugly: while the DEX
  // console refused every protected key and pointed operators at THIS screen,
  // those two were editable from NOWHERE — not locked, absent — and
  // `dexDirectPoolsEnabled` defaults to off, so the addon's entire direct-pool
  // venue could only be switched on by writing the settings row by hand. Removing
  // a field from this page is only ever safe once the other screen actually
  // carries it. Both directions have now been checked; the DEX console's own
  // parity suite asserts every key it renders is one the reader reads.
  //
  // No `addonRequired` on purpose. That flag renders a field dimmed and
  // `pointer-events-none` for any path `checkAddonAvailable` does not know, and
  // it knows only chart-engine — gating the master switch on it would produce a
  // switch that cannot be clicked.
  //
  // The key below must match `DEX_SETTINGS_KEYS` in
  // backend/src/api/(ext)/dex/utils/settings.ts character for character; a typo
  // writes a row no reader ever looks at and the control silently does nothing.
  {
    key: "dexEnabled",
    label: "Web3 Trading",
    type: "switch",
    description:
      "Master switch for non-custodial token swaps from a user's own wallet. Off means no quote, no build and no swap route answers at all — every swap endpoint refuses before it does any work. Everything else about Web3 Trading — token allowlist mode, KYC requirement, slippage, screening — is configured in Web3 Trading → Settings, which only opens once this is on. Changing this requires a Super Admin account.",
    category: "features",
    subcategory: "Web3 Trading",
  },

  // ========================================
  // WALLET SETTINGS
  // ========================================

  // Wallet Types
  {
    key: "fiatWallets",
    label: "Fiat Wallets",
    type: "switch",
    description: "Enable fiat currency wallets",
    category: "wallet",
    subcategory: "Wallet Types",
  },

  // Transactions
  {
    key: "deposit",
    label: "Deposits",
    type: "switch",
    description: "Enable deposit functionality",
    category: "wallet",
    subcategory: "Transactions",
  },
  {
    key: "withdraw",
    label: "Withdrawals",
    type: "switch",
    description: "Enable withdrawal functionality",
    category: "wallet",
    subcategory: "Transactions",
  },
  {
    key: "transfer",
    label: "Transfers",
    type: "switch",
    description: "Enable transfer functionality between wallets",
    category: "wallet",
    subcategory: "Transactions",
  },
  {
    key: "withdrawProcessingTime",
    label: "Withdrawal Processing Time",
    type: "switch",
    description:
      "Show estimated processing time on the withdrawal page",
    category: "wallet",
    subcategory: "Transactions",
  },
  // Spot deposit attribution — see plans/done/SPOT-DEPOSIT-MODES.md.
  //
  // Every customer's spot deposit lands at the platform's ONE exchange
  // address per network, so something has to say which customer it came
  // from. This selects how. Read at intent creation and stamped on the
  // intent; an open intent finishes under the mode it was created in, so a
  // flip changes only new deposits. Materialised as `hash_claim` by the
  // backend the first time the deposit address is asked for.
  {
    key: "spotDepositMode",
    label: "Spot Deposit Attribution",
    type: "select",
    description:
      "How a spot deposit is matched to the customer who sent it. Hash claim shows the exchange's shared address; the customer declares the amount, sends, and pastes the transaction hash, which is credited only against their own earlier declaration. Exact amount shows the same address with an exact amount to send — unique among open deposits on that network — and needs no hash. Own address (Ecosystem) shows the customer their own Funding address; the platform moves the deposit to the exchange and claims it itself, with the network fee taken from the amount. Own address needs the Ecosystem addon and a listed token, and falls back to Exact amount on a network where it cannot apply. Changing this requires a Super Admin account.",
    options: [
      { label: "Hash claim — shared exchange address, customer pastes the hash (default)", value: "hash_claim" },
      { label: "Exact amount — shared exchange address, no hash", value: "amount_match" },
      { label: "Own address — the customer's Ecosystem address, swept to the exchange", value: "ecosystem_custody" },
    ],
    category: "wallet",
    subcategory: "Transactions",
  },

  // Security & Approval
  //
  // ONE SWITCH, BECAUSE TWO OF THEM COULD DISAGREE AND THE PANEL SHOWED THE
  // LOSING ONE.
  //
  // `withdrawApproval` is the legacy key, and its name reads backwards: the row
  // stores "true" to mean AUTO-approve, i.e. no approval required. It used to
  // have a field of its own here, labelled "(Legacy)". Both fields rendered as
  // plain switches with no relationship between them, so an install could — and
  // one did — show `withdrawApproval` ON and `withdrawAutoApprove` OFF at the
  // same time.
  //
  // That pair is not merely confusing, it is read the dangerous way round.
  // `finance/withdraw/spot/index.post.ts` resolves new-key-if-present, else
  // legacy, else manual; and OFF on the new switch is ambiguous in the panel,
  // because a key with no settings row renders its DEFAULT_SETTINGS value. So
  // "legacy ON, new OFF" means auto-approve is IN FORCE whenever the new row has
  // never been written — while the switch an operator would look at to check
  // says it is not. The reading that matters is the one nobody performs.
  //
  // The legacy field is gone. The route keeps its fallback for installs that
  // have not migrated, and two things now make that fallback unreachable rather
  // than merely unlikely: saving this switch mirrors its value into
  // `withdrawApproval` (see the core settings PUT), and
  // `scripts/migrate-withdraw-auto-approve.mjs` pins existing installs. A key
  // whose value is always written by the key beside it cannot contradict it.
  {
    key: "withdrawAutoApprove",
    label: "Auto-Approve Withdrawals",
    type: "switch",
    description:
      "When enabled, spot wallet withdrawals are processed automatically without manual approval. When disabled, withdrawals require admin review before execution. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "Security",
  },
  // Who bears the blockchain network fee on a SPOT withdrawal.
  //
  // This had a shipped default and five backend readers and NO CONTROL ON ANY
  // SCREEN, so the answer was "the customer" on every install ever shipped and
  // no admin of any role could change it from any page — only a direct settings
  // PUT or a database write. It was documented as a known gap rather than
  // fixed, which is why it survived so long.
  //
  // The exchange takes its withdrawal fee out of whatever amount it is handed
  // (Binance, KuCoin, OKX and Bybit all do), so the two positions differ in what
  // the route submits: amount PLUS the quoted fee when the platform absorbs it,
  // the bare amount when the customer does.
  {
    key: "withdrawChainFee",
    label: "Platform Absorbs the Network Fee",
    type: "switch",
    description:
      "When enabled, the platform pays the blockchain network fee on a spot withdrawal out of its own exchange balance and the customer's address receives the full amount they asked for. When disabled, the fee is taken out of what they receive. It does not change what is debited from their wallet either way.",
    category: "wallet",
    subcategory: "Fees",
  },
  {
    key: "transfiIbanEnabled",
    label: "TransFi Virtual IBANs",
    type: "switch",
    description:
      "Issue each customer a permanent EUR bank account they can pay into at any time, instead of starting a checkout for every deposit. Requires TransFi to be configured. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "TransFi",
  },
  {
    key: "transfiOnrampEnabled",
    label: "TransFi Buy Crypto (Onramp)",
    type: "switch",
    description:
      "Let customers buy crypto with local currency through TransFi. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "TransFi",
  },
  {
    key: "transfiOnrampCustody",
    label: "Buy Crypto Delivery",
    type: "select",
    options: [
      { value: "self", label: "To the customer own wallet (no platform custody)" },
      { value: "platform", label: "To a platform wallet, credited to their balance" },
    ],
    description:
      "Where purchased crypto is delivered. Customer wallet means the platform never holds the crypto and carries no custody risk. Platform wallet requires per-chain deposit addresses and on-chain attribution, and is not available yet.",
    category: "wallet",
    subcategory: "TransFi",
  },
  {
    key: "transfiOfframpEnabled",
    label: "TransFi Sell Crypto (Offramp)",
    type: "switch",
    description:
      "Let customers sell crypto for local currency paid to their bank or mobile wallet. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "TransFi",
  },
  {
    key: "transfiOfframpCustody",
    label: "Sell Crypto Source",
    type: "select",
    options: [
      { value: "self", label: "Customer sends from their own wallet (no platform custody)" },
      { value: "platform", label: "Debit their platform balance and send from the hot wallet" },
    ],
    description:
      "Who sends the crypto to TransFi. Customer sends means the platform never touches it. Platform sends requires a funded hot wallet and an on-chain send path, and is not available yet.",
    category: "wallet",
    subcategory: "TransFi",
  },
  {
    key: "depositExpiration",
    label: "Deposit Expiration",
    type: "switch",
    description: "Enable deposit address expiration for security",
    category: "wallet",
    subcategory: "Security",
  },

  // Pool backing — see plans/done/POOL-BACKING.md
  {
    key: "poolBackingMode",
    label: "Pool Backing Mode",
    type: "select",
    description:
      "Spot balances are backed by one pooled exchange account; Funding (ECO) balances by on-chain custody. A transfer between them, or an admin credit, moves the number and not the coins. Monitor keeps a ledger of every such move and reconciles liabilities against holdings every 15 minutes. Manual also refuses an ECO → Spot transfer that would push a currency's unsettled obligations past the cap, and opens the settle doors. Auto lets the platform settle transfer obligations on its own, from and to its treasury wallet, bounded by the settle threshold and the max automatic settlement. Changing this requires a Super Admin account.",
    options: [
      { label: "Off — record only", value: "off" },
      { label: "Monitor — ledger, reconciliation and console (recommended)", value: "monitor" },
      { label: "Manual — monitor, plus the cap and the settle doors", value: "manual" },
      { label: "Auto — manual, plus automatic settlement", value: "auto" },
    ],
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingCapUsd",
    label: "Backing Cap (USD)",
    type: "text",
    description:
      "The most a currency's unsettled ECO → Spot transfers may add up to, in USD, before further ones are refused (Manual and Auto modes only). Leave empty to alert without refusing. A per-currency override can be set on the Pool Backing page.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingThresholdUsd",
    label: "Settle Threshold (USD)",
    type: "text",
    description:
      "The smallest net obligation, in USD, worth a settlement movement. Below it the obligations wait and accumulate.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingMaxSettlementUsd",
    label: "Max Settlement (USD)",
    type: "text",
    description:
      "The largest single movement the settlement engine makes, in USD — every movement it plans is bounded by it, whether the cron planned it in Auto mode or an admin pressed Settle now or Convert now. A net obligation above it is settled in instalments, one per cycle. Leave empty to remove the cap. Only Record external and Mark arrived, which record movements made by hand, are not bounded by it. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingAlertUsd",
    label: "Gap Alert (USD)",
    type: "text",
    description:
      "Notify admins when a currency's gap between liabilities and exchange holdings exceeds this, in USD. Leave empty to alert only on persistent unexplained drift.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingDriftRuns",
    label: "Drift Confirmation Runs",
    type: "text",
    description:
      "How many consecutive reconciliations an unexplained residual must survive before it is recorded as drift. Deposits credited on the exchange minutes before the platform credits them are transients, not findings.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingPause",
    label: "Pause Settlements",
    type: "switch",
    description:
      "The kill switch. While on, no settlement movement is started and no settlement is marked settled; the ledger and the reconciliation keep running. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingAutoConvert",
    label: "Exchange Conversions",
    type: "switch",
    description:
      "Let the platform place a market order on the exchange to acquire a currency the exchange owes but never received — the Spot side of an ECO → Spot transfer between two currencies. Runs from the cron in Auto mode and from the Convert now door in Manual mode; the venue fee is booked as recognised loss. While off, conversion obligations stay open until an operator records an external movement. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingCustodyReadsPerRun",
    label: "Custody Addresses Read Per Run",
    type: "text",
    description:
      "How many customer custody addresses per currency and chain each reconciliation reads on-chain, oldest read first; the rest contribute their last cached figure with its age. The treasury, the master wallet and the custodial contracts are read every run regardless. Reads share the chain scanner's rate limits. Default 50.",
    category: "wallet",
    subcategory: "Pool backing",
  },
  {
    key: "poolBackingMasterReserve",
    label: "Master Wallet Reserve",
    type: "text",
    placeholder: '{"ETH": 0.05, "BSC": 0.1, "TRON": 20, "SOL": 0.5}',
    description:
      "JSON keyed by ECOSYSTEM CHAIN NAME (ETH, BSC, POLYGON, TRON, SOL, XMR, …), not the coin symbol — TRON's floor is {\"TRON\": 100}, in TRX. Values are in the chain's native coin: what the master wallet must keep after a settlement draws on it for a native-coin movement, or after it funds the gas of a token movement (TRC20, SPL). The master pays every customer withdrawal's gas on its chain, so draining it stalls them all. A chain not listed keeps the built-in floor (0.02 on EVM chains, 0.1 SOL, 20 TRX, 0.1 XMR); a coin or rail spelling (TRX, TRC20, BEP20, MATIC) is folded onto its chain. Changing this requires a Super Admin account.",
    category: "wallet",
    subcategory: "Pool backing",
  },

  // Fees
  {
    key: "walletTransferFee",
    label: "Wallet Transfer Fee",
    type: "range",
    description: "Fee percentage for wallet transfers",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 10,
    step: 0.1,
    suffix: "%",
  },
  {
    key: "walletTransferSpread",
    label: "Wallet Transfer Spread",
    type: "range",
    description:
      "Margin applied against the mid-market rate on cross-currency transfers, protecting against rate-feed lag",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 10,
    step: 0.1,
    suffix: "%",
  },
  {
    key: "spotWithdrawFee",
    label: "Spot Withdraw Fee",
    type: "range",
    description: "Fee percentage for spot withdrawals",
    category: "wallet",
    subcategory: "Fees",
    min: 0,
    max: 10,
    step: 0.1,
    suffix: "%",
  },

  // Display
  {
    key: "walletCurrencyIcons",
    label: "Currency Icons",
    type: "switch",
    description:
      "Show the coin logo beside the currency code on the wallets list and on each wallet's page. A currency with no icon falls back to its letter mark, so nothing renders as a broken image — see Admin > System > Currency Icons for which symbols are missing and to fetch them.",
    category: "wallet",
    subcategory: "Display",
  },

  // ========================================
  // SOCIAL & LINKS SETTINGS
  // ========================================

  // Social Media
  {
    key: "customSocialLinks",
    label: "Social Links",
    type: "socialLinks",
    description:
      "Add and manage social media links with custom icons. These links will be displayed in the footer.",
    category: "social",
    subcategory: "Social Media",
  },

  // Mobile Apps
  {
    key: "appStoreLink",
    label: "App Store Link",
    type: "url",
    description: "Link to your iOS app on the App Store",
    category: "social",
    subcategory: "Mobile Apps",
  },
  {
    key: "googlePlayLink",
    label: "Google Play Link",
    type: "url",
    description: "Link to your Android app on Google Play Store",
    category: "social",
    subcategory: "Mobile Apps",
  },
  /*
   * THE MINIMUM VERSION THE NATIVE APPS MAY RUN.
   *
   * The server already RECORDS a client's version — the `app-version` header
   * becomes a session label and a `mobile_device.appVersion` row — but nothing
   * ever read it back or published a floor, so there was no way to retire a
   * build that had shipped a defect.
   *
   * These two rows are that floor. They ride on GET /api/settings, which is
   * unauthenticated and exempt from both the licence gate and the geo gate, so
   * an app that is signed out (or blocked, or unlicensed) can still learn it —
   * which a force-update gate has to be able to do. No new endpoint.
   *
   * LEAVE THEM EMPTY unless you mean it. Empty means "no floor"; the app fails
   * open on an absent, unparseable or unreachable value, because a gate that
   * failed closed would turn one bad value into every install on earth showing
   * an update wall, with no way to recover from inside the app.
   */
  {
    key: "mobileMinVersionIos",
    label: "Minimum iOS App Version",
    type: "text",
    description:
      "Dotted version, e.g. 1.4.0. Published to native clients on GET /api/settings. NOT YET ENFORCED by any shipped build — no Flutter code reads this key or compares versions. Leave empty for no minimum.",
    category: "social",
    subcategory: "Mobile Apps",
  },
  {
    key: "mobileMinVersionAndroid",
    label: "Minimum Android App Version",
    type: "text",
    description:
      "Dotted version, e.g. 1.4.0. Published to native clients on GET /api/settings. NOT YET ENFORCED by any shipped build — no Flutter code reads this key or compares versions. Leave empty for no minimum.",
    category: "social",
    subcategory: "Mobile Apps",
  },

  // ========================================
  // BRANDING / LOGOS SETTINGS
  // ========================================

  // Site Logos
  {
    key: "logo",
    label: "Square Logo (Light)",
    type: "file",
    description: "Square logo for light theme (96x96px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "darkLogo",
    label: "Square Logo (Dark)",
    type: "file",
    description: "Square logo for dark theme (96x96px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 96, height: 96 },
  },
  {
    key: "fullLogo",
    label: "Full Logo (Light)",
    type: "file",
    description: "Full logo with text for light theme (350x75px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 350, height: 75 },
  },
  {
    key: "darkFullLogo",
    label: "Full Logo (Dark)",
    type: "file",
    description: "Full logo with text for dark theme (350x75px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 350, height: 75 },
  },
  {
    key: "cardLogo",
    label: "Card Logo",
    type: "file",
    description: "Logo for sharing cards and previews (256x256px)",
    category: "logos",
    subcategory: "Site Logos",
    fileSize: { width: 256, height: 256 },
  },

  // Favicons
  {
    key: "favicon16",
    label: "Favicon 16x16",
    type: "file",
    description: "Small favicon for browser tabs",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 16, height: 16 },
  },
  {
    key: "favicon32",
    label: "Favicon 32x32",
    type: "file",
    description: "Standard favicon for browser tabs",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 32, height: 32 },
  },
  {
    key: "favicon96",
    label: "Favicon 96x96",
    type: "file",
    description: "Large favicon for high-DPI displays",
    category: "logos",
    subcategory: "Favicons",
    fileSize: { width: 96, height: 96 },
  },

  // Apple Touch Icons
  {
    key: "appleIcon57",
    label: "Apple Icon 57x57",
    type: "file",
    description: "iPhone (non-Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 57, height: 57 },
  },
  {
    key: "appleIcon60",
    label: "Apple Icon 60x60",
    type: "file",
    description: "iPhone (iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 60, height: 60 },
  },
  {
    key: "appleIcon72",
    label: "Apple Icon 72x72",
    type: "file",
    description: "iPad (non-Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 72, height: 72 },
  },
  {
    key: "appleIcon76",
    label: "Apple Icon 76x76",
    type: "file",
    description: "iPad (iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 76, height: 76 },
  },
  {
    key: "appleIcon114",
    label: "Apple Icon 114x114",
    type: "file",
    description: "iPhone (Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 114, height: 114 },
  },
  {
    key: "appleIcon120",
    label: "Apple Icon 120x120",
    type: "file",
    description: "iPhone (Retina, iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 120, height: 120 },
  },
  {
    key: "appleIcon144",
    label: "Apple Icon 144x144",
    type: "file",
    description: "iPad (Retina)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 144, height: 144 },
  },
  {
    key: "appleIcon152",
    label: "Apple Icon 152x152",
    type: "file",
    description: "iPad (Retina, iOS 7+)",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 152, height: 152 },
  },
  {
    key: "appleIcon180",
    label: "Apple Icon 180x180",
    type: "file",
    description: "iPhone 6 Plus",
    category: "logos",
    subcategory: "Apple Touch Icons",
    fileSize: { width: 180, height: 180 },
  },

  // Android Icons
  {
    key: "androidIcon192",
    label: "Android Icon 192x192",
    type: "file",
    description: "Standard Android icon",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 192, height: 192 },
  },
  {
    key: "androidIcon256",
    label: "Android Icon 256x256",
    type: "file",
    description: "Medium Android icon",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 256, height: 256 },
  },
  {
    key: "androidIcon384",
    label: "Android Icon 384x384",
    type: "file",
    description: "Large Android icon",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 384, height: 384 },
  },
  {
    key: "androidIcon512",
    label: "Android Icon 512x512",
    type: "file",
    description: "Extra large Android icon (PWA)",
    category: "logos",
    subcategory: "Android Icons",
    fileSize: { width: 512, height: 512 },
  },

  // Microsoft Icons
  {
    key: "msIcon144",
    label: "MS Icon 144x144",
    type: "file",
    description: "Windows tile icon",
    category: "logos",
    subcategory: "Microsoft Icons",
    fileSize: { width: 144, height: 144 },
  },
];

// @/config/defaultSettings.ts
export const DEFAULT_SETTINGS = {
  binaryLevels: "2",
  cardLogo: "",
  deposit: "true",
  // Must match the backend's absent-key default (cron/jobs/wallet.ts): with no
  // row saved, stale deposits are credited rather than timed out.
  depositExpiration: "false",
  // Must match DEFAULT_SPOT_DEPOSIT_MODE in backend/src/utils/spot-deposit/settings.ts:
  // an upgrade must not change what a customer is shown until the admin chooses.
  spotDepositMode: "hash_claim",
  poolBackingMode: "monitor",
  poolBackingThresholdUsd: "50",
  poolBackingMaxSettlementUsd: "10000",
  poolBackingDriftRuns: "3",
  poolBackingPause: "false",
  // Phase 3, matching backend/src/utils/pool-backing/settings.ts POOL_BACKING_DEFAULTS:
  // conversions off, 50 customer addresses per run, no master reserve override.
  poolBackingAutoConvert: "false",
  poolBackingCustodyReadsPerRun: "50",
  poolBackingMasterReserve: "{}",
  transfiIbanEnabled: "false",
  transfiOnrampEnabled: "false",
  transfiOnrampCustody: "self",
  transfiOfframpEnabled: "false",
  transfiOfframpCustody: "self",
  customSocialLinks: JSON.stringify([
    {
      id: "1",
      name: "Facebook",
      url: "https://facebook.com",
      icon: "/img/social/facebook.svg",
    },
    {
      id: "2",
      name: "Twitter",
      url: "https://x.com",
      icon: "/img/social/twitter.svg",
    },
    {
      id: "3",
      name: "Instagram",
      url: "https://instagram.com",
      icon: "/img/social/instagram.svg",
    },
    {
      id: "4",
      name: "Telegram",
      url: "https://t.me",
      icon: "/img/social/telegram.svg",
    },
  ]),
  // DEX Swap — mirrors DEX_SETTINGS_DEFAULTS in
  // backend/src/api/(ext)/dex/utils/settings.ts. Settings are TEXT, so OFF is
  // the STRING "false"; every dex reader goes through a boolean coercer for
  // exactly this reason.
  //
  // THREE keys, not four, and this list is deliberately NOT the same as the
  // FIELD_DEFINITIONS block above, which now carries only `dexEnabled`. The two
  // extra entries here are not leftovers:
  //
  //   this table  = the default a BACKEND READER must agree with
  //   a field     = a control this SCREEN offers
  //
  // Those are different questions, and the frontend/backend default-parity suite
  // asks the first one. `dexAllowlistMode` and `dexKycRequired` still have
  // backend readers, so dropping their defaults would not remove a reader, only
  // the guard on it — the same reason `withdrawApproval` stays below. They are
  // EDITED in the DEX console; the other two protected `dex*` keys,
  // `dexDirectPoolsEnabled` and `dexPoolRiskAckRequired`, are defaulted there as
  // well as edited there, along with everything else in DEX_SETTINGS_KEYS.
  dexEnabled: "false",
  dexAllowlistMode: "ALLOWLIST",
  dexKycRequired: "false",
  fiatWallets: "true",
  floatingLiveChat: "true",
  // NOTE: there is deliberately no `forexInvestment` flag here, and no
  // `*Restrictions` flag either.
  //
  // `forexInvestment` used to sit in this list reading as a platform-wide
  // on/off switch for the forex addon, and nothing anywhere read it — no
  // route, no cron, no middleware, no frontend guard — nor was it reachable
  // from the admin settings UI. Setting it to "false" changed nothing at all.
  // The real switch is the `extensions` table.
  //
  // The same was true of all twelve `*Restrictions` keys that used to live
  // here: binary, bot, deposit, ecommerce, forex, ico, mlm, staking, trade,
  // transfer, wallet and withdrawal. (The known-issues note that prompted this
  // named only five, and one of those — `p2pRestrictions` — never existed.
  // The real set was twelve.) Every one was read by nothing — no static
  // reference and no
  // runtime-built key — and none had a `FIELD_DEFINITIONS` entry, so none of
  // them rendered a control either. They were removed for the same reason
  // `forexInvestment` was: a setting that reads as a feature toggle and
  // controls nothing is worse than a missing one, because an operator
  // believes the restriction is in force.
  //
  // Do not confuse these with Geo Restrictions, which is a real, live feature
  // with its own admin screens under /admin/system/geo-restriction.
  googleAuthStatus: "true",
  // Captcha. `pow` rather than `turnstile` because a default that needs keys
  // the operator has not created yet would leave a fresh install advertising a
  // provider it cannot run. PoW is weak but needs nothing, so it is the honest
  // floor; the backend defaults to the same value for an ABSENT row
  // (utils/captcha/config.ts), which is what a fresh install actually has since
  // `initial.sql` seeds no settings at all.
  captchaProvider: "pow",
  captchaSiteKey: "",
  captchaSecretKey: "",
  captchaScoreThreshold: "0.5",
  // Retained: no longer rendered as a control, but still read by the backend as
  // the legacy source for `captchaProvider` on installs that predate the select.
  powCaptchaStatus: "true",
  powCaptchaDifficulty: "medium",
  investment: "true",
  kycStatus: "true",
  // Off by default on purpose — see backend/src/utils/kyc.ts. These per-level
  // feature switches predate any server that read them, so turning enforcement
  // on without first curating each level would revoke access from users who
  // have it today.
  kycFeatureEnforcement: "false",
  layoutSwitcher: "true",
  logo: "",
  mlmSettings:
    '{"unilevel":{"levels":"5","levelsPercentage":[{"level":1,"value":"1"},{"level":2,"value":"2"},{"level":3,"value":"3"},{"level":4,"value":"4"},{"level":5,"value":"5"}]}}',
  mlmSystem: "UNILEVEL",
  navbarLogoDisplay: "SQUARE_WITH_NAME",
  newsStatus: "true",
  referralApprovalRequired: "true",
  spotWithdrawFee: "1",
  transfer: "true",
  twoFactorStatus: "true",
  twoFactorSmsStatus: "true",
  twoFactorEmailStatus: "true",
  twoFactorAppStatus: "true",
  verifyEmailStatus: "true",
  // Off unless an operator asks for it: the badge links out to the register, so
  // turning it on is a disclosure decision rather than a display preference.
  verificationBadge: "false",
  appStoreLink: "",
  googlePlayLink: "",
  // Empty is "no floor". See the FIELD_DEFINITIONS note above for why the
  // native force-update gate fails open rather than closed.
  mobileMinVersionIos: "",
  mobileMinVersionAndroid: "",
  unilevelLevels: "5",
  walletTransferFee: "1",
  walletTransferSpread: "0.5",
  // On by default: the icon set ships with the platform and a symbol without a
  // file degrades to its letter mark, so there is nothing to opt into. The
  // switch exists for operators who want the wallets list to stay text-only.
  // `useCurrencyIcon` falls back to `true` for the same reason, so an install
  // that has never written the row behaves like this default.
  walletCurrencyIcons: "true",
  withdraw: "true",
  // Legacy withdrawApproval="true" means AUTO-approve on the backend; the
  // effective default when unset is manual review, so both must default off.
  //
  // `withdrawApproval` has no FIELD_DEFINITION any more (see the Security &
  // Approval block above) but stays in this table on purpose: the spot withdraw
  // route still READS it as a fallback, and this map is what the frontend/backend
  // default-parity suite compares those readers against. Dropping the entry would
  // not remove the reader, it would only remove the guard on it.
  withdrawApproval: "false",
  withdrawAutoApprove: "false",
  // Withdrawal 2FA policy is opt-in: an existing install keeps behaving exactly
  // as before until an admin turns these on. The per-method keys default ON so
  // enabling the requirement without touching them means "any method we offer".
  withdrawTwoFactorRequired: "false",
  withdrawTwoFactorChallenge: "false",
  withdrawTwoFactorAppAllowed: "true",
  withdrawTwoFactorEmailAllowed: "true",
  withdrawTwoFactorSmsAllowed: "true",
  transferPinRequired: "false",
  transferTwoFactorChallenge: "false",
  transferSecurityScope: "client",
  transferTwoFactorAppAllowed: "true",
  transferTwoFactorEmailAllowed: "true",
  transferTwoFactorSmsAllowed: "true",
  withdrawChainFee: "false",
  withdrawProcessingTime: "true",
  marketLinkRoute: "trade",
};
