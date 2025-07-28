// Public endpoint for getting default page content (no auth required)
const DEFAULT_HOME_VARIABLES = {
  hero: {
    badge: "#1 Crypto Trading Platform",
    title: "Trade Crypto",
    subtitle: "Like a Pro",
    description: "Advanced trading tools with lightning-fast execution",
    cta: "Start Trading Free",
    features: ["Secure Trading", "Real-time Data", "24/7 Support"]
  },
  featuresSection: {
    badge: "Why Choose Us",
    title: "Built for",
    subtitle: "Professional Traders",
    description: "Experience the most advanced trading platform with unmatched security and professional-grade tools for traders of all levels."
  },
  features: [
    {
      title: "Advanced Security",
      description: "Bank-grade security with cold storage and multi-signature wallets to protect your assets.",
      icon: "Shield",
      gradient: "from-green-400 to-emerald-500",
      bg: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
    },
    {
      title: "Real-time Charts",
      description: "Professional charting tools with technical indicators and market data for informed trading decisions.",
      icon: "BarChart3",
      gradient: "from-blue-400 to-cyan-500",
      bg: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20"
    }
  ],
  globalSection: {
    badge: "Global Platform",
    title: "Reliable",
    subtitle: "Trading Platform",
    description: "Join millions of traders worldwide using our secure and reliable trading platform.",
    stats: [
      { label: "Active Users", value: "2M+" },
      { label: "Daily Volume", value: "$500M+" },
      { label: "Countries", value: "150+" },
      { label: "Cryptocurrencies", value: "200+" }
    ],
    platformFeatures: {
      title: "Platform Features",
      items: ["24/7 Trading", "Mobile App", "API Access", "Advanced Orders"]
    }
  },
  gettingStarted: {
    badge: "Get Started",
    title: "Start Trading",
    subtitle: "in 3 Easy Steps",
    steps: [
      {
        title: "Create Account",
        description: "Sign up with your email and verify your identity.",
        icon: "UserPlus",
        gradient: "from-blue-400 to-cyan-500"
      },
      {
        title: "Deposit Funds",
        description: "Add funds to your account using various payment methods.",
        icon: "CreditCard",
        gradient: "from-green-400 to-emerald-500"
      },
      {
        title: "Start Trading",
        description: "Begin trading with our advanced tools and features.",
        icon: "TrendingUp",
        gradient: "from-purple-400 to-pink-500"
      }
    ]
  },
  cta: {
    badge: "Ready to Trade?",
    title: "Join the Future of Trading",
    description: "Start your trading journey today with the most advanced cryptocurrency trading platform.",
    button: "Start Trading Now",
    buttonUser: "Go to Dashboard",
    features: ["Free Registration", "Instant Deposits", "24/7 Support"],
    benefits: ["Low Fees", "High Liquidity", "Secure Platform"]
  }
};

const DEFAULT_LEGAL_CONTENT = {
  about: `<h1>About Us</h1><p>Learn more about our platform and mission.</p>`,
  privacy: `<h1>Privacy Policy</h1><p>Your privacy is important to us.</p>`,
  terms: `<h1>Terms of Service</h1><p>Terms and conditions for using our platform.</p>`,
  contact: `<h1>Contact Us</h1><p>Get in touch with our support team.</p>`
};

export const metadata = {
  summary: "Get default page template",
  operationId: "getDefaultPageTemplate",
  tags: ["Public", "Default Pages"],
  parameters: [
    {
      name: "pageId",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Page identifier (home, about, privacy, terms, contact)",
    },
    {
      name: "pageSource",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["default", "builder"] },
      description: "Page source type",
    },
  ],
  responses: {
    200: {
      description: "Default page template",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              pageId: { type: "string" },
              pageSource: { type: "string" },
              type: { type: "string" },
              title: { type: "string" },
              variables: { type: "object" },
              content: { type: "string" },
              meta: { type: "object" },
              status: { type: "string" },
              lastModified: { type: "string" }
            }
          }
        }
      }
    }
  }
  // No requiresAuth - this is public
};

export default async (data) => {
  const { params, query } = data;
  const { pageId } = params;
  const { pageSource = 'default' } = query;

  const validPageIds = ['home', 'about', 'privacy', 'terms', 'contact'];
  
  if (!validPageIds.includes(pageId)) {
    return {
      error: "Invalid page ID",
      status: 400
    };
  }

  const isHomePage = pageId === 'home';
  let title = pageId.charAt(0).toUpperCase() + pageId.slice(1) + ' Page';
  if (isHomePage && pageSource === 'builder') {
    title = 'Builder Home Page';
  } else if (isHomePage && pageSource === 'default') {
    title = 'Default Home Page';
  }

  // Always return a valid default page template
  return {
    id: 'public-default-template',
    pageId,
    pageSource,
    type: isHomePage ? 'variables' : 'content',
    title,
    variables: isHomePage ? DEFAULT_HOME_VARIABLES : {},
    content: isHomePage ? "" : DEFAULT_LEGAL_CONTENT[pageId as keyof typeof DEFAULT_LEGAL_CONTENT] || "",
    meta: {
      seoTitle: title,
      seoDescription: `${title} content`,
      keywords: []
    },
    status: 'active',
    lastModified: new Date().toISOString()
  };
}; 