// RootLayout.tsx
import React from "react";
import "../globals.css";
import "simplebar-react/dist/simplebar.min.css";
import Providers from "@/provider/providers";
import DirectionProvider from "@/provider/direction.provider";
import { routing } from "@/i18n/routing";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { getUserProfile } from "@/lib/fetchers/user";
import { getSettings } from "@/lib/fetchers/settings";
import ConditionalLayoutProvider from "@/components/layout/conditional-layout-provider";
import { SettingsStatus } from "@/components/development/settings-status";
import { GlobalAuthDetector } from "@/components/auth/global-auth-detector";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_SITE_NAME || "My App",
    template: `%s - ${process.env.NEXT_PUBLIC_SITE_NAME || "My App"}`,
  },
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "My App Description",
};

async function loadTranslations(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Error loading translations for locale: ${locale}`, error);
    return null;
  }
}

// Type for settings result with fallback flag
type SettingsResult = {
  settings: Record<string, any>;
  extensions: any[];
  _fallback?: boolean;
};

// Safe wrapper for SSR API calls with better error handling
async function safeGetUserProfile(retries = 2) {
  const isDevelopment = process.env.NODE_ENV === "development";

  for (let i = 0; i < retries; i++) {
    try {
      const profile = await getUserProfile();
      return profile;
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isDevelopment) {
        console.warn(
          `SSR: Profile fetch attempt ${i + 1}/${retries} failed:`,
          errorMessage
        );
      }

      if (isLastAttempt) {
        if (isDevelopment) {
          console.warn(
            "SSR: All profile fetch attempts failed, continuing without profile"
          );
        }
        return null;
      }

      // Shorter wait for profile as it's less critical
      if (isDevelopment && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  return null;
}

async function safeGetSettings(retries = 3): Promise<SettingsResult> {
  const isDevelopment = process.env.NODE_ENV === "development";

  for (let i = 0; i < retries; i++) {
    try {
      const result = await getSettings();
      if (result && (result.settings || result.extensions)) {
        return result as SettingsResult;
      }
      // If result is empty but no error, treat as failed attempt
      throw new Error("Empty settings result");
    } catch (error) {
      const isLastAttempt = i === retries - 1;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (isDevelopment) {
        console.warn(
          `SSR: Settings fetch attempt ${i + 1}/${retries} failed:`,
          errorMessage
        );
      }

      if (isLastAttempt) {
        console.error(
          "SSR: All settings fetch attempts failed, using fallback"
        );
        return {
          settings: {},
          extensions: [],
          _fallback: true, // Flag to indicate this is fallback data
        };
      }

      // Wait before retry (exponential backoff in development)
      if (isDevelopment && i < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 100)
        );
      }
    }
  }

  return { settings: {}, extensions: [], _fallback: true };
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout(
  props: RootLayoutProps
): Promise<React.JSX.Element> {
  try {
    const params = await props.params;
    const { children } = props;
    const { locale } = params;

    // Validate locale first
    if (!routing.locales.includes(locale)) {
      console.warn(
        `Invalid locale: ${locale}. Available locales: ${routing.locales.join(", ")}`
      );
      notFound();
    }

    // Load translations with better error handling
    const messages = await loadTranslations(locale);
    if (!messages) {
      console.error(`Failed to load translations for locale: ${locale}`);
      // Provide fallback with empty messages instead of failing
    }

    // Fetch global configuration with improved error handling
    const isDevelopment = process.env.NODE_ENV === "development";
    let profile = null;
    let settingsResult: SettingsResult = { settings: {}, extensions: [] };

    try {
      // In development, use Promise.allSettled for better error isolation
      // In production, fail fast if needed
      const fetchPromises = [safeGetUserProfile(), safeGetSettings()];

      const [profileResult, settingsResultPromise] =
        await Promise.allSettled(fetchPromises);

      if (profileResult.status === "fulfilled") {
        profile = profileResult.value;
      } else {
        if (isDevelopment) {
          console.warn("Profile fetch failed:", profileResult.reason);
        }
      }

      if (settingsResultPromise.status === "fulfilled") {
        settingsResult = settingsResultPromise.value || {
          settings: {},
          extensions: [],
        };

        // In development, warn if we're using fallback data
        if (isDevelopment && settingsResult._fallback) {
          console.warn(
            "⚠️  Using fallback settings data - menu might not be complete"
          );
        }
      } else {
        if (isDevelopment) {
          console.warn("Settings fetch failed:", settingsResultPromise.reason);
        }
        settingsResult = { settings: {}, extensions: [], _fallback: true };
      }
    } catch (error) {
      console.error("Error fetching layout data:", error);
      // Continue with defaults
      settingsResult = { settings: {}, extensions: [], _fallback: true };
    }

    // Ensure we have valid settings structure
    const { settings = {}, extensions = [], _fallback } = settingsResult || {};

    // In development, add helpful debugging info
    if (isDevelopment && _fallback) {
      console.info(
        "🔧 Development tip: If menu is missing, try refreshing or check backend connection"
      );
    }

    // Always return a valid layout, even if some data is missing
    return (
      <html lang={locale} suppressHydrationWarning>
        <head>
          {/* Conditionally load TradingView library if chart type is set to TradingView */}
          {settings?.chartType === "TRADINGVIEW" && (
            <script 
              src="/lib/chart/charting_library/charting_library/charting_library.standalone.js"
              async
            />
          )}
        </head>
        <body 
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          style={{ "--radius": "0.5rem" } as React.CSSProperties}
          suppressHydrationWarning
        >
          <NextIntlClientProvider locale={locale} messages={messages || {}}>
            <Providers
              profile={profile}
              settings={settings}
              extensions={extensions}
            >
              <DirectionProvider locale={locale}>
                <ConditionalLayoutProvider>
                  {children}
                  <SettingsStatus />
                  <GlobalAuthDetector />
                </ConditionalLayoutProvider>
              </DirectionProvider>
            </Providers>
          </NextIntlClientProvider>
        </body>
      </html>
    );
  } catch (error) {
    // Return a minimal fallback layout that won't cause additional errors
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-background font-sans antialiased">
          <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Application Error</h1>
              <p className="text-muted-foreground mt-2">
                Failed to initialize the application. Please try refreshing the
                page.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Error:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          </div>
        </body>
      </html>
    );
  }
}
