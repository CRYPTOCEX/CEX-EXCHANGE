/**
 * Next.js Configuration (Updated for Custom i18n)
 *
 * Changes from previous config:
 * - Removed withNextIntl wrapper
 * - Added I18nOptimizationPlugin for namespace extraction
 * - Added bundle analyzer (run with ANALYZE=true)
 */

const path = require("path");
const fs = require("fs");

// ============================================================================
// ADDON DETECTION
// Check which optional addons are installed at build time
// Development: check for .tsx source files
// Production/Client: check for dist/index.js (compiled distribution)
// ============================================================================

// Helper to check if a columns.tsx file exists in ext app folder
const checkExtColumns = (extPath) => {
  const fullPath = path.resolve(__dirname, `app/[locale]/(ext)/${extPath}/columns.tsx`);
  return fs.existsSync(fullPath);
};

// ---- Chart Engine (components) ----
const CHART_ENGINE_PATH = path.resolve(__dirname, "components/(ext)/chart-engine");
const CHART_ENGINE_SOURCE = path.join(CHART_ENGINE_PATH, "index.tsx");
const CHART_ENGINE_DIST = path.join(CHART_ENGINE_PATH, "dist/index.js");
const HAS_CHART_ENGINE_SOURCE = fs.existsSync(CHART_ENGINE_SOURCE);
const HAS_CHART_ENGINE_DIST = fs.existsSync(CHART_ENGINE_DIST);
const HAS_CHART_ENGINE = HAS_CHART_ENGINE_SOURCE || HAS_CHART_ENGINE_DIST;

// ---- Extension Addons (for CRM user page tables) ----
// These are optional addon modules that may or may not be installed
const EXT_ADDONS = {
  ico: {
    name: "ICO",
    stub: "@/lib/stubs/ext-columns-stub",
    real: "@/app/[locale]/(ext)/admin/ico/transaction/columns",
    path: "admin/ico/transaction",
  },
  p2p: {
    name: "P2P",
    stub: "@/lib/stubs/ext-columns-stub",
    real: "@/app/[locale]/(ext)/admin/p2p/offer/columns",
    path: "admin/p2p/offer",
    // Additional paths for p2p
    additionalPaths: [
      { real: "@/app/[locale]/(ext)/admin/p2p/trade/columns", path: "admin/p2p/trade" }
    ]
  },
  staking: {
    name: "Staking",
    stub: "@/lib/stubs/ext-columns-stub",
    real: "@/app/[locale]/(ext)/admin/staking/position/columns",
    path: "admin/staking/position",
  },
  affiliate: {
    name: "Affiliate",
    stub: "@/lib/stubs/ext-columns-stub",
    real: "@/app/[locale]/(ext)/admin/affiliate/referral/columns",
    path: "admin/affiliate/referral",
  },
  ecommerce: {
    name: "Ecommerce",
    stub: "@/lib/stubs/ext-columns-stub",
    real: "@/app/[locale]/(ext)/admin/ecommerce/order/columns",
    path: "admin/ecommerce/order",
  },
  forex: {
    name: "Forex",
    stub: "@/lib/stubs/ext-columns-stub",
    real: "@/app/[locale]/(ext)/forex/transaction/columns",
    path: "forex/transaction",
  },
};

// Check which ext addons exist
const extAddonStatus = {};
for (const [key, config] of Object.entries(EXT_ADDONS)) {
  extAddonStatus[key] = checkExtColumns(config.path);
}

// Build aliases for ext addons (redirect real path to stub when not installed)
const buildExtColumnAliases = () => {
  const aliases = {};
  for (const [key, config] of Object.entries(EXT_ADDONS)) {
    if (!extAddonStatus[key]) {
      // Addon not installed - alias real path to stub
      aliases[config.real] = "./lib/stubs/ext-columns-stub";
      // Handle additional paths (like p2p/trade)
      if (config.additionalPaths) {
        for (const additional of config.additionalPaths) {
          aliases[additional.real] = "./lib/stubs/ext-columns-stub";
        }
      }
    }
  }
  return aliases;
};

const buildExtColumnAliasesAbsolute = () => {
  const aliases = {};
  for (const [key, config] of Object.entries(EXT_ADDONS)) {
    if (!extAddonStatus[key]) {
      // Addon not installed - alias real path to stub
      aliases[config.real] = path.resolve(__dirname, "lib/stubs/ext-columns-stub");
      // Handle additional paths (like p2p/trade)
      if (config.additionalPaths) {
        for (const additional of config.additionalPaths) {
          aliases[additional.real] = path.resolve(__dirname, "lib/stubs/ext-columns-stub");
        }
      }
    }
  }
  return aliases;
};

// Bundle analyzer - run with: ANALYZE=true pnpm build
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// Multi-path environment loading with fallbacks (same approach as backend)
const envPaths = [
  path.resolve(process.cwd(), "../.env"),     // Root .env (priority)
  path.resolve(__dirname, "../.env"),        // Development relative
  path.resolve(__dirname, ".env"),           // Frontend .env fallback
  path.resolve(process.cwd(), ".env")        // Current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("Frontend: No .env file found in any of the expected locations");
  console.warn("Frontend: Checked paths:", envPaths);
}

const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

// Import i18n optimization plugins
const I18nOptimizationPlugin = require("./i18n/webpack-plugin-i18n");
const I18nKeyOptimizationPlugin = require("./i18n/webpack-plugin-i18n-keys");

// Extract hostname from NEXT_PUBLIC_SITE_URL for image optimization
const getSiteHostname = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    return url.hostname;
  } catch {
    return null;
  }
};
const siteHostname = getSiteHostname();

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // Expose addon availability as environment variables
  // These are determined at build time based on folder existence
  env: {
    NEXT_PUBLIC_HAS_CHART_ENGINE: HAS_CHART_ENGINE ? "true" : "false",
  },

  typescript: {
    ignoreBuildErrors: true
  },

  poweredByHeader: false,
  trailingSlash: false,
  transpilePackages: ["lucide-react", "framer-motion"],
  // Mark packages that use worker_threads as server external
  serverExternalPackages: ['ioredis', 'sharp', 'pino', 'pino-pretty'],

  // Bundle optimization - tree-shake these packages more aggressively
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'framer-motion',
      '@iconify/react',
    ],
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
      // Chart Engine alias - redirect stub to real module when installed
      // Use relative path for Turbopack (avoids Windows path issues)
      ...(HAS_CHART_ENGINE ? {
        '@/lib/stubs/chart-engine-stub': './components/(ext)/chart-engine',
      } : {}),
      // Extension column aliases - redirect missing addons to stub
      ...buildExtColumnAliases(),
    },
    // Exclude worker_threads from bundling
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  // Removed explicit env object to allow Next.js automatic NEXT_PUBLIC_ variable exposure
  // This allows all NEXT_PUBLIC_* environment variables to be available in the client
  webpack: (config, { dev, isServer }) => {
    // =========================================================================
    // CHART ENGINE ALIAS
    // When installed: redirect stub imports to real chart-engine module
    // When not installed: stub imports work as-is (stub always exists)
    // =========================================================================
    if (HAS_CHART_ENGINE) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/lib/stubs/chart-engine-stub": path.resolve(__dirname, "components/(ext)/chart-engine"),
      };
    }

    // =========================================================================
    // EXTENSION COLUMN ALIASES
    // Redirect missing ext addon imports to stub (returns empty columns)
    // =========================================================================
    config.resolve.alias = {
      ...config.resolve.alias,
      ...buildExtColumnAliasesAbsolute(),
    };

    // Add i18n optimization plugins (only in production build)
    if (!dev && !isServer) {
      // Namespace-level extraction (generates manifest of namespaces per route)
      config.plugins.push(
        new I18nOptimizationPlugin({
          debug: false,
          messagesDir: "messages",
        })
      );

      // Key-level extraction (generates optimized chunks with only needed keys)
      config.plugins.push(
        new I18nKeyOptimizationPlugin({
          debug: process.env.I18N_DEBUG === "true",
          messagesDir: "messages",
          defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en",
        })
      );
    }

    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
        encoding: require.resolve('encoding'),
      };
    }

    // Minimal webpack configuration for @reown packages
    // Disable strict ES module resolution for problematic packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }

    // Ignore module resolution errors for lit submodules
    config.ignoreWarnings = [
      /Module not found: Package path \.\/decorators is not exported/,
      /Module not found: Package path \.\/directive is not exported/,
      /Module not found: Package path \.\/directive-helpers is not exported/,
      /Module not found: Package path \.\/static-html is not exported/,
      /Module not found: Package path \.\/html is not exported/,
    ];

    return config;
  },
  async headers() {
    return [
      {
        // Service Worker headers - critical for push notifications
        source: '/sw-push.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV === "development";

    // In production, no rewrites needed - both frontend and backend are on the same domain
    // In development, proxy API calls to the local backend server
    if (!isDev) {
      return [];
    }

    // Use 127.0.0.1 for rewrites - Next.js server-side proxy always runs locally
    const backendUrl = `http://127.0.0.1:${backendPort}`;

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`, // Proxy to Backend (dev only)
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`, // Proxy to Backend (dev only)
      },
      {
        source: "/img/logo/:path*",
        destination: `${backendUrl}/img/logo/:path*`, // Proxy to Backend (dev only)
      },
    ];
  },
  images: {
    // Enable image optimization for better caching and performance
    unoptimized: false,
    // Cache optimized images for 60 days
    minimumCacheTTL: 5184000,
    // Image formats to support
    formats: ['image/webp', 'image/avif'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.lorem.space",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "a0.muscache.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // IPFS Gateway - Pinata (Primary)
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
      },
      {
        protocol: "https",
        hostname: "*.mypinata.cloud",
      },
      // IPFS Gateways (Fallback)
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
      },
      {
        protocol: "https",
        hostname: "dweb.link",
      },
      // Local uploads
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      // Dynamic site hostname from NEXT_PUBLIC_SITE_URL
      ...(siteHostname && siteHostname !== "localhost"
        ? [
            {
              protocol: "https",
              hostname: siteHostname,
            },
          ]
        : []),
    ],
  },
  // Add error handling configuration
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Development-specific optimizations
  ...(process.env.NODE_ENV === 'development' && {
    productionBrowserSourceMaps: false,
  }),
  // Allow cross-origin requests from local network IPs in dev mode
  // Format: just hostnames, no protocol or port
  // Additional IPs can be added via NEXT_PUBLIC_ALLOWED_DEV_IPS env variable (comma-separated)
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    // ngrok tunnels
    '*.ngrok-free.dev',
    '*.ngrok.io',
    // Add custom IPs from environment variable
    ...(process.env.NEXT_PUBLIC_ALLOWED_DEV_IPS
      ? process.env.NEXT_PUBLIC_ALLOWED_DEV_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
      : []),
  ],
};

module.exports = withBundleAnalyzer(nextConfig);
