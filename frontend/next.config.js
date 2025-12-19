 
const path = require("path");
const fs = require("fs");

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
const withNextIntl = require("next-intl/plugin")();

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

  typescript: {
    ignoreBuildErrors: true
  },
  
  poweredByHeader: false,
  trailingSlash: false,
  transpilePackages: ["lucide-react", "framer-motion"],
  // Mark packages that use worker_threads as server external
  serverExternalPackages: ['ioredis', 'sharp', 'pino', 'pino-pretty'],

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
    },
    // Exclude worker_threads from bundling
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  // Removed explicit env object to allow Next.js automatic NEXT_PUBLIC_ variable exposure
  // This allows all NEXT_PUBLIC_* environment variables to be available in the client
  webpack: (config, { dev, isServer }) => {
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
  async rewrites() {
    const backendUrl = `http://localhost:${backendPort}`;
    
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`, // Proxy to Backend
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`, // Proxy to Backend
      },
      {
        source: "/img/logo/:path*",
        destination: `${backendUrl}/img/logo/:path*`, // Proxy to Backend
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
};

module.exports = withNextIntl(nextConfig);
