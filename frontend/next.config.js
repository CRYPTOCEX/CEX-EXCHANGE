 
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
    console.log(`Frontend: Loading environment from ${envPath}`);
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

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  transpilePackages: ["lucide-react", "framer-motion"],
  typescript: {
    // Disable type checking during build
    ignoreBuildErrors: true,
  },
  // Turbopack configuration (moved from experimental.turbo as it's now stable)
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
    },
  },
  experimental: {
    // Activate new client-side router improvements (better navigation performance)
    clientSegmentCache: true,
  },
  env: {
    NEXT_PUBLIC_LANGUAGES: process.env.NEXT_PUBLIC_LANGUAGES || "en,es,fr,de,it,pt,ru,ar,ja,ko,hi,tr",
    NEXT_PUBLIC_DEFAULT_LANGUAGE: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en",
  },
  webpack: (config, { dev, isServer }) => {
    // Disable image optimization for static imports to avoid sharp dependency
    config.module.rules.forEach((rule) => {
      if (rule.loader === 'next-image-loader') {
        rule.options = {
          ...rule.options,
          unoptimized: true,
        };
      }
    });
    
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
    // Disable image optimization to avoid Sharp dependency issues on servers without v2 microarchitecture
    unoptimized: true,
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
    ],
  },
  // Add error handling configuration
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

module.exports = withNextIntl(nextConfig);
