"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LEGAL_CONTENT = exports.DEFAULT_HOME_VARIABLES = exports.DEFAULT_PAGE_SOURCES = exports.DEFAULT_PAGE_IDS = void 0;
exports.isDefaultPageId = isDefaultPageId;
exports.isDefaultPageSource = isDefaultPageSource;
exports.defaultPageType = defaultPageType;
exports.defaultPageTitle = defaultPageTitle;
exports.resolvePageMeta = resolvePageMeta;
exports.seedPageMeta = seedPageMeta;
exports.defaultLegalContent = defaultLegalContent;
exports.DEFAULT_PAGE_IDS = [
    "home",
    "about",
    "privacy",
    "terms",
    "contact",
];
exports.DEFAULT_PAGE_SOURCES = ["default", "builder"];
function isDefaultPageId(value) {
    return (typeof value === "string" &&
        exports.DEFAULT_PAGE_IDS.includes(value));
}
function isDefaultPageSource(value) {
    return (typeof value === "string" &&
        exports.DEFAULT_PAGE_SOURCES.includes(value));
}
function defaultPageType(pageId) {
    return pageId === "home" ? "variables" : "content";
}
exports.DEFAULT_HOME_VARIABLES = {
    hero: {
        title: "Trade Crypto",
        subtitle: "like a pro",
        description: "Advanced trading tools, lightning-fast execution, and unmatched security. Join millions of traders worldwide.",
        cta: "Start Trading Free",
        badge: "#1 Crypto Trading Platform",
        features: ["Secure Trading", "Real-time Data", "24/7 Support"],
    },
    features: [
        {
            title: "Fast Execution",
            description: "Execute trades quickly with our reliable matching engine and responsive trading interface.",
            icon: "Zap",
            gradient: "from-yellow-400 to-orange-500",
            bg: "from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20",
        },
        {
            title: "Secure Platform",
            description: "Multi-layer security with encryption, secure wallets, and authentication protocols to protect your assets.",
            icon: "Shield",
            gradient: "from-green-400 to-emerald-500",
            bg: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
        },
        {
            title: "Real-time Charts",
            description: "Professional charting tools with technical indicators and market data for informed trading decisions.",
            icon: "BarChart3",
            gradient: "from-blue-400 to-cyan-500",
            bg: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
        },
        {
            title: "User Community",
            description: "Join our trading community and connect with other traders to share insights and strategies.",
            icon: "Users",
            gradient: "from-purple-400 to-pink-500",
            bg: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
        },
        {
            title: "Order Types",
            description: "Various order types including market, limit, and stop orders for flexible trading strategies.",
            icon: "Target",
            gradient: "from-red-400 to-rose-500",
            bg: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
        },
        {
            title: "Competitive Fees",
            description: "Transparent fee structure with competitive rates for both makers and takers.",
            icon: "DollarSign",
            gradient: "from-indigo-400 to-blue-500",
            bg: "from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20",
        },
    ],
    featuresSection: {
        badge: "Why Choose Us",
        title: "Built for",
        subtitle: "Professional Traders",
        description: "Experience the most advanced trading platform with unmatched security and professional-grade tools for traders of all levels.",
    },
    globalSection: {
        badge: "Global Platform",
        title: "Reliable",
        subtitle: "Trading Platform",
        description: "Experience secure cryptocurrency trading with advanced security measures and professional tools.",
        stats: [
            {
                icon: "Users",
                label: "User-Friendly",
                value: "Easy Interface",
            },
            {
                icon: "Globe",
                label: "Global Access",
                value: "Trade Anywhere",
            },
            {
                icon: "Shield",
                label: "Secure Trading",
                value: "Protected Assets",
            },
            {
                icon: "Award",
                label: "Quality Service",
                value: "24/7 Support",
            },
        ],
        platformFeatures: {
            title: "Platform Features",
            items: [
                "Real-time market data and price feeds",
                "Multiple order types for trading flexibility",
                "Responsive web interface for all devices",
                "Customer support and help resources",
                "Secure wallet and account management",
                "Professional charting and analysis tools",
            ],
        },
    },
    gettingStarted: {
        badge: "Get Started",
        title: "Start Your",
        subtitle: "Trading Journey",
        steps: [
            {
                title: "Create Account",
                description: "Sign up for your free trading account with email verification and secure password setup.",
                icon: "Users",
                step: "01",
                gradient: "from-blue-500 to-cyan-500",
            },
            {
                title: "Secure Your Wallet",
                description: "Set up your secure wallet with proper authentication and backup recovery methods.",
                icon: "Shield",
                step: "02",
                gradient: "from-purple-500 to-pink-500",
            },
            {
                title: "Start Trading",
                description: "Explore markets, analyze charts, and execute your first trades with our intuitive platform.",
                icon: "BarChart3",
                step: "03",
                gradient: "from-orange-500 to-red-500",
            },
        ],
    },
    cta: {
        badge: "Start Your Journey",
        title: "Ready to Start Trading?",
        subtitle: "",
        description: "Join our platform and experience secure cryptocurrency trading with professional tools and real-time market data.",
        button: "Create Free Account",
        buttonUser: "Explore Markets",
        features: ["No Credit Card Required", "Free Registration"],
        featuresUser: ["Real-time Data", "Secure Trading"],
    },
    marketSection: {
        title: "Asset",
        priceTitle: "Price",
        capTitle: "Cap",
        changeTitle: "24h",
        viewAllText: "View All Markets",
    },
    ticker: {
        enabled: true,
    },
    mobileApp: {
        enabled: true,
        comingSoon: false,
        comingSoonLabel: "",
        badge: "Download Our App",
        title: "Trade on the Go",
        subtitle: "Anytime, Anywhere",
        description: "Experience seamless cryptocurrency trading with our powerful mobile app. Access all features from your pocket.",
        features: [
            {
                title: "Biometric Security",
                description: "Face ID & fingerprint login",
                icon: "Fingerprint",
                gradient: "from-emerald-500 to-teal-500",
            },
            {
                title: "Instant Alerts",
                description: "Real-time price notifications",
                icon: "Bell",
                gradient: "from-blue-500 to-cyan-500",
            },
            {
                title: "Live Charts",
                description: "Professional trading tools",
                icon: "ChartLine",
                gradient: "from-purple-500 to-pink-500",
            },
            {
                title: "Multi-Wallet",
                description: "Manage all your assets",
                icon: "Wallet",
                gradient: "from-orange-500 to-red-500",
            },
        ],
    },
    extensionSections: {
        spot: { enabled: true, order: 0 },
        binary: { enabled: true, order: 1 },
        futures: { enabled: true, order: 2 },
        ecosystem: { enabled: true, order: 3 },
        staking: { enabled: true, order: 4 },
        ico: { enabled: true, order: 5 },
        ai: { enabled: true, order: 6 },
        copyTrading: { enabled: true, order: 7 },
        affiliate: { enabled: true, order: 8 },
    },
    seo: {
        title: "Professional Crypto Trading Platform",
        description: "Trade cryptocurrencies with advanced tools, real-time data, and secure infrastructure. Join millions of traders worldwide.",
        keywords: [
            "crypto trading",
            "cryptocurrency",
            "bitcoin",
            "trading platform",
            "blockchain",
        ],
    },
};
exports.DEFAULT_LEGAL_CONTENT = {
    about: `
    <h1>About Our Platform</h1>
    <p>We are a leading cryptocurrency trading platform dedicated to providing secure, reliable, and user-friendly trading services.</p>
    <h2>Our Mission</h2>
    <p>To democratize access to cryptocurrency trading and provide professional-grade tools for traders of all levels.</p>
  `,
    privacy: `
    <h1>Privacy Policy</h1>
    <p><strong>This is a template.</strong> Replace every [SQUARE BRACKET] with
    your own details and have it reviewed before you rely on it. It describes
    the data this platform collects by default; it cannot know your legal
    entity, your jurisdiction, your retention periods or your regulator.</p>

    <p>Last updated: [DATE]. This policy explains how [YOUR LEGAL ENTITY NAME]
    ("we") collects, uses and protects your personal information when you use
    our website and mobile application.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Account information</strong> — your name, email address and,
      if you provide one, your phone number. Required to create and operate
      your account.</li>
      <li><strong>Identity verification (KYC)</strong> — where verification is
      required, we collect identity document images (for example a passport,
      driver's licence, national identity card or residence permit), a
      photograph of you holding that document, and the identity details on it.
      This is collected to meet anti-money-laundering obligations.</li>
      <li><strong>Financial information</strong> — your balances, deposits,
      withdrawals, orders and transaction history, and the destination
      addresses or bank details you supply for withdrawals.</li>
      <li><strong>Content you create</strong> — support tickets and messages,
      peer-to-peer trade chat, dispute evidence you upload, and reports you
      submit about other users' content.</li>
      <li><strong>Technical information</strong> — your IP address, device and
      browser information, and a device token if you enable push
      notifications.</li>
    </ul>
    <p>We do not use advertising, analytics or crash-reporting services in our
    mobile application, and we do not track you across other companies' apps or
    websites.</p>

    <h2>How we use it</h2>
    <p>To operate your account and provide the service; to verify your identity
    and meet our legal and regulatory obligations; to detect and prevent fraud
    and abuse; to answer your support requests; and to send you service
    messages about your account and transactions.</p>

    <h2>Who we share it with</h2>
    <ul>
      <li><strong>Payment processors.</strong> If you pay by card, your card
      details are entered into the payment provider's own interface and go
      directly to them — we never receive or store your card number.</li>
      <li><strong>Other users.</strong> In peer-to-peer trading, the payment
      details you publish on an offer and the messages you send in a trade are
      visible to your counterparty.</li>
      <li><strong>Authorities and regulators</strong>, where we are legally
      required to disclose.</li>
      <li><strong>Service providers</strong> acting on our instructions —
      [LIST YOUR HOSTING, EMAIL, SMS AND OTHER PROCESSORS].</li>
    </ul>
    <p>We do not sell your personal information.</p>

    <h2>Deleting your account</h2>
    <p>You can delete your account from the app or the website, or by
    contacting us at [YOUR PRIVACY CONTACT EMAIL]. Deletion anonymises your
    record immediately: your email address is replaced with a placeholder and
    released, and your password, phone number, username, avatar, wallet address
    and profile details are removed.</p>
    <p><strong>Some records are kept.</strong> Transaction and order history,
    identity-verification documents and the details taken from them, and
    support tickets and their messages are retained after deletion, because
    financial and anti-money-laundering rules require us to keep them for
    [YOUR RETENTION PERIOD]. We keep them for that purpose only.</p>

    <h2>Security</h2>
    <p>Data is encrypted in transit. Identity documents are stored privately
    and are not published at a publicly reachable address. Access to them is
    limited to staff who need it for verification or dispute handling.</p>

    <h2>Your rights</h2>
    <p>Depending on where you live you may have the right to access, correct,
    export or delete your personal information, to object to or restrict
    certain processing, and to complain to a supervisory authority. To exercise
    any of these, contact [YOUR PRIVACY CONTACT EMAIL].</p>

    <h2>Children</h2>
    <p>This service is not directed at anyone under [MINIMUM AGE], and we do
    not knowingly collect their information.</p>

    <h2>Changes</h2>
    <p>We will post any changes to this policy on this page and update the date
    above. Material changes will be notified to you directly.</p>

    <h2>Contact</h2>
    <p>[YOUR LEGAL ENTITY NAME], [REGISTERED ADDRESS]. Privacy enquiries:
    [YOUR PRIVACY CONTACT EMAIL].</p>
  `,
    terms: `
    <h1>Terms of Service</h1>
    <p>These Terms of Service govern your use of our platform and services.</p>
    <h2>Acceptance of Terms</h2>
    <p>By accessing and using our services, you accept and agree to be bound by these terms.</p>
  `,
    contact: `
    <h1>Contact Us</h1>
    <p>Get in touch with our support team for any questions or assistance.</p>
    <h2>Support Channels</h2>
    <p>We offer multiple ways to contact our support team including email, live chat, and help center.</p>
  `,
};
function defaultPageTitle(pageId, pageSource) {
    if (pageId === "home") {
        return pageSource === "builder" ? "Builder Home Page" : "Default Home Page";
    }
    return pageId.charAt(0).toUpperCase() + pageId.slice(1) + " Page";
}
function toPlainObject(value) {
    let candidate = value;
    if (typeof candidate === "string") {
        try {
            candidate = JSON.parse(candidate);
        }
        catch (_a) {
            return {};
        }
    }
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        return {};
    }
    return candidate;
}
function nonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "" ? value : null;
}
function resolvePageMeta(args) {
    const { pageId, pageSource, meta, variables } = args;
    const resolved = { ...toPlainObject(meta) };
    const placeholderTitle = defaultPageTitle(pageId, pageSource);
    const placeholderDescription = `${placeholderTitle} content`;
    const seo = toPlainObject(toPlainObject(variables).seo);
    const derivedTitle = nonEmptyString(seo.title);
    const derivedDescription = nonEmptyString(seo.description);
    const derivedKeywords = Array.isArray(seo.keywords) ? seo.keywords : null;
    const storedTitle = nonEmptyString(resolved.seoTitle);
    if (storedTitle === null || storedTitle === placeholderTitle) {
        if (derivedTitle !== null)
            resolved.seoTitle = derivedTitle;
        else
            delete resolved.seoTitle;
    }
    const storedDescription = nonEmptyString(resolved.seoDescription);
    if (storedDescription === null ||
        storedDescription === placeholderDescription) {
        if (derivedDescription !== null)
            resolved.seoDescription = derivedDescription;
        else
            delete resolved.seoDescription;
    }
    const storedKeywords = resolved.keywords;
    if (!Array.isArray(storedKeywords) || storedKeywords.length === 0) {
        if (derivedKeywords !== null && derivedKeywords.length > 0) {
            resolved.keywords = derivedKeywords;
        }
        else {
            delete resolved.keywords;
        }
    }
    return resolved;
}
function seedPageMeta(pageId, pageSource, variables = pageId === "home" ? exports.DEFAULT_HOME_VARIABLES : {}) {
    return resolvePageMeta({ pageId, pageSource, meta: {}, variables });
}
function defaultLegalContent(pageId) {
    var _a;
    if (pageId === "home")
        return "";
    return ((_a = exports.DEFAULT_LEGAL_CONTENT[pageId]) !== null && _a !== void 0 ? _a : "");
}
