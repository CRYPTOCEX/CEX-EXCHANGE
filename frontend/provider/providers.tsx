"use client";

// Providers.tsx
import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useThemeStore } from "@/store";
import { WebSocketProvider } from "./websocket.provider";
import { ExtensionChecker } from "@/lib/extensions";
import FloatingChatProvider from "@/components/global/floating-chat-provider";
import { useSettingsSync } from "@/hooks/use-settings-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface ProvidersProps {
  children: React.ReactNode;
  profile: any;
  settings: any;
  extensions: any;
}

const ConfigInitializer = ({
  profile,
  settings,
  extensions,
}: Omit<ProvidersProps, "children">) => {
  const setUser = useUserStore((state) => state.setUser);
  const { setSettings, setExtensions, setSettingsFetched, setSettingsError } =
    useConfigStore();

  // Use the settings sync hook for optimistic updates
  useSettingsSync();

  useEffect(() => {
    setUser(profile);

    // Only mark as fetched if we actually have settings data
    if (settings && Object.keys(settings).length > 0) {
      setSettings(settings);
      setExtensions(extensions || []);

      // Initialize extension checker with available extensions
      if (extensions && extensions.length > 0) {
        ExtensionChecker.getInstance().initialize(extensions);
      }
    } else {
      // If settings are empty, don't mark as fetched so it will retry
      setSettingsFetched(false);
      setSettingsError(null);
    }
  }, [
    profile,
    settings,
    extensions,
    setSettings,
    setExtensions,
    setSettingsFetched,
    setSettingsError,
  ]);

  return null;
};

// Add error handler component
function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Prevent the default browser behavior which might crash the app
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
    };

    // Add global error listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

// Font and radius utilities hook
export const useFontClasses = () => {
  const { radius } = useThemeStore();
  
  return {
    className: `${geistSans.variable} ${geistMono.variable} antialiased`,
    style: { "--radius": `${radius}rem` } as React.CSSProperties
  };
};

const Providers = ({
  children,
  profile,
  settings,
  extensions,
}: ProvidersProps) => {
  return (
      <ThemeProvider
        attribute="class"
        enableSystem={true}
        defaultTheme="system"
        disableTransitionOnChange={false}
      >
        <ConfigInitializer
          profile={profile}
          settings={settings}
          extensions={extensions}
        />
        {profile?.id ? (
          <WebSocketProvider userId={profile.id}>
            <div className={cn("h-full")}>{children}</div>
            <FloatingChatProvider />
          </WebSocketProvider>
        ) : (
          <>
            <div className={cn("h-full")}>{children}</div>
            <FloatingChatProvider />
          </>
        )}
        <Toaster />
      <GlobalErrorHandler />
    </ThemeProvider>
  );
};

export default Providers;
