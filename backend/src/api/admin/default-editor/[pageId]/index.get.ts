import { models } from "@b/db";

export const metadata = {
  summary: "Get default page content",
  operationId: "getDefaultPageContent",
  tags: ["Admin", "Default Editor"],
  parameters: [
    {
      index: 0,
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
      description: "Page source type - default for regular pages, builder for builder-created pages",
    },
  ],
  responses: {
    200: {
      description: "Page content retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              pageId: { type: "string" },
              type: { type: "string", enum: ["variables", "content"] },
              title: { type: "string" },
              variables: { type: "object" },
              content: { type: "string" },
              meta: { type: "object" },
              status: { type: "string" },
              lastModified: { type: "string" },
            },
          },
        },
      },
    },
    404: {
      description: "Page not found",
    },
  },
  requiresAuth: true,
  permission: "view.page"
};

// Default content for home page variables
const DEFAULT_HOME_VARIABLES = {
  hero: {
    title: "Trade Crypto",
    subtitle: "like a pro", 
    description: "Advanced trading tools, lightning-fast execution, and unmatched security. Join millions of traders worldwide.",
    cta: "Start Trading Free",
    badge: "#1 Crypto Trading Platform",
    features: [
      "Secure Trading",
      "Real-time Data", 
      "24/7 Support"
    ]
  },
  features: [
    {
      title: "Fast Execution",
      description: "Execute trades quickly with our reliable matching engine and responsive trading interface.",
      icon: "Zap",
      gradient: "from-yellow-400 to-orange-500",
      bg: "from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20"
    },
    {
      title: "Secure Platform", 
      description: "Multi-layer security with encryption, secure wallets, and authentication protocols to protect your assets.",
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
    },
    {
      title: "User Community",
      description: "Join our trading community and connect with other traders to share insights and strategies.",
      icon: "Users",
      gradient: "from-purple-400 to-pink-500",
      bg: "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
    },
    {
      title: "Order Types",
      description: "Various order types including market, limit, and stop orders for flexible trading strategies.",
      icon: "Target",
      gradient: "from-red-400 to-rose-500",
      bg: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20"
    },
    {
      title: "Competitive Fees",
      description: "Transparent fee structure with competitive rates for both makers and takers.",
      icon: "DollarSign",
      gradient: "from-indigo-400 to-blue-500",
      bg: "from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20"
    }
  ],
  featuresSection: {
    badge: "Why Choose Us",
    title: "Built for",
    subtitle: "Professional Traders",
    description: "Experience the most advanced trading platform with unmatched security and professional-grade tools for traders of all levels."
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
        value: "Easy Interface"
      },
      {
        icon: "Globe", 
        label: "Global Access",
        value: "Trade Anywhere"
      },
      {
        icon: "Shield",
        label: "Secure Trading", 
        value: "Protected Assets"
      },
      {
        icon: "Award",
        label: "Quality Service",
        value: "24/7 Support"
      }
    ],
    platformFeatures: {
      title: "Platform Features",
      items: [
        "Real-time market data and price feeds",
        "Multiple order types for trading flexibility", 
        "Responsive web interface for all devices",
        "Customer support and help resources",
        "Secure wallet and account management",
        "Professional charting and analysis tools"
      ]
    }
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
        gradient: "from-blue-500 to-cyan-500"
      },
      {
        title: "Secure Your Wallet", 
        description: "Set up your secure wallet with proper authentication and backup recovery methods.",
        icon: "Shield",
        step: "02", 
        gradient: "from-purple-500 to-pink-500"
      },
      {
        title: "Start Trading",
        description: "Explore markets, analyze charts, and execute your first trades with our intuitive platform.",
        icon: "BarChart3",
        step: "03",
        gradient: "from-orange-500 to-red-500"
      }
    ]
  },
  cta: {
    badge: "Start Your Journey",
    title: "Ready to Start Trading?",
    subtitle: "",
    description: "Join our platform and experience secure cryptocurrency trading with professional tools and real-time market data.",
    button: "Create Free Account",
    buttonUser: "Explore Markets",
    features: [
      "No Credit Card Required",
      "Free Registration"
    ],
    featuresUser: [
      "Real-time Data", 
      "Secure Trading"
    ]
  },
  marketSection: {
    title: "Asset",
    priceTitle: "Price",
    capTitle: "Cap", 
    changeTitle: "24h",
    viewAllText: "View All Markets"
  },
  ticker: {
    enabled: true
  },
  mobileApp: {
    enabled: true
  },
  seo: {
    title: "Professional Crypto Trading Platform",
    description: "Trade cryptocurrencies with advanced tools, real-time data, and secure infrastructure. Join millions of traders worldwide.",
    keywords: ["crypto trading", "cryptocurrency", "bitcoin", "trading platform", "blockchain"]
  }
};

// Default content for legal pages
const DEFAULT_LEGAL_CONTENT = {
  about: `
    <h1>About Our Platform</h1>
    <p>We are a leading cryptocurrency trading platform dedicated to providing secure, reliable, and user-friendly trading services.</p>
    <h2>Our Mission</h2>
    <p>To democratize access to cryptocurrency trading and provide professional-grade tools for traders of all levels.</p>
  `,
  privacy: `
    <h1>Privacy Policy</h1>
    <p>This Privacy Policy describes how we collect, use, and protect your personal information.</p>
    <h2>Information We Collect</h2>
    <p>We collect information you provide directly to us, such as when you create an account or contact us for support.</p>
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
  `
};

export default async (data) => {
  const { params, query } = data;
  const { pageId } = params;
  const { pageSource = 'default' } = query;

  const validPageIds = ['home', 'about', 'privacy', 'terms', 'contact'];
  const validPageSources = ['default', 'builder'];
  
  if (!validPageIds.includes(pageId)) {
    return {
      error: "Invalid page ID",
      status: 400
    };
  }

  if (!validPageSources.includes(pageSource)) {
    return {
      error: "Invalid page source",
      status: 400
    };
  }

  try {
    // Try to get existing page from database
    let page = await models.defaultPage.findOne({
      where: { pageId, pageSource }
    });

    // If page doesn't exist, create default content
    if (!page) {
      const isHomePage = pageId === 'home';
      
      // Create appropriate title based on page and source
      let title = pageId.charAt(0).toUpperCase() + pageId.slice(1) + ' Page';
      if (isHomePage && pageSource === 'builder') {
        title = 'Builder Home Page';
      } else if (isHomePage && pageSource === 'default') {
        title = 'Default Home Page';
      }
      
      try {
        page = await models.defaultPage.create({
          pageId,
          pageSource,
          type: isHomePage ? 'variables' : 'content',
          title,
          variables: isHomePage ? DEFAULT_HOME_VARIABLES : {},
          content: isHomePage ? "" : DEFAULT_LEGAL_CONTENT[pageId as keyof typeof DEFAULT_LEGAL_CONTENT],
          meta: {
            seoTitle: title,
            seoDescription: `${title} content`,
            keywords: []
          },
          status: 'active'
        });
      } catch (createError) {
        console.error("Error creating default page:", createError.message);
        
        // If creation fails, return a runtime default without saving to database
        return {
          id: 'runtime-default',
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
      }
    }

    // Ensure variables is properly parsed from database
    let variables = page.variables;
    if (typeof variables === 'string') {
      try {
        variables = JSON.parse(variables);
      } catch (e) {
        console.error("Failed to parse variables string:", e.message);
        variables = {};
      }
    }

    // Handle character-indexed corruption in GET as well
    if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
      const keys = Object.keys(variables);
      const isCharacterIndexed = keys.length > 0 && keys.every(key => !isNaN(parseInt(key)));
      
      if (isCharacterIndexed) {
        try {
          const jsonString = keys.sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => variables[key])
            .join('');
          variables = JSON.parse(jsonString);
        } catch (e) {
          console.error("Failed to reconstruct variables from character indices:", e.message);
          variables = {};
        }
      }
    }

    return {
      id: page.id,
      pageId: page.pageId,
      pageSource: page.pageSource,
      type: page.type,
      title: page.title,
      variables: variables || {},
      content: page.content || "",
      meta: page.meta || {},
      status: page.status,
      lastModified: page.updatedAt.toISOString()
    };

  } catch (error) {
    console.error("Error retrieving page content:", error.message);
    
    // Always return a valid page structure instead of an error
    const isHomePage = pageId === 'home';
    let title = pageId.charAt(0).toUpperCase() + pageId.slice(1) + ' Page';
    if (isHomePage && pageSource === 'builder') {
      title = 'Builder Home Page';
    } else if (isHomePage && pageSource === 'default') {
      title = 'Default Home Page';
    }
    
    return {
      id: 'emergency-fallback',
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
  }
}; 