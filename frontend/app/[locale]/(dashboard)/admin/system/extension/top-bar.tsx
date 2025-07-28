"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useExtensionStore } from "@/store/extension";
import { useSettings } from "@/hooks/use-settings";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function TopBar() {
  const t = useTranslations("dashboard");
  const { setFilter, fetchExtensions } = useExtensionStore();
  const { retryFetch } = useSettings();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    console.log("🔄 Starting cache refresh...");
    
    try {
      // Clear browser cache and localStorage
      if ('caches' in window) {
        console.log("🗑️ Clearing browser caches...");
        const cacheNames = await caches.keys();
        console.log("📦 Found caches:", cacheNames);
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage items related to settings/extensions
      console.log("🗑️ Clearing localStorage...");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('settings') || key.includes('extensions') || key.includes('config'))) {
          keysToRemove.push(key);
        }
      }
      console.log("🔑 Removing localStorage keys:", keysToRemove);
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage as well
      console.log("🗑️ Clearing sessionStorage...");
      sessionStorage.clear();

      // Clear all browser storage
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        console.log("🗑️ Clearing all browser storage...");
      }

      console.log("🔄 Refreshing extension and settings data...");
      
      // Refresh both extensions and settings cache
      await Promise.all([
        fetchExtensions(),
        retryFetch()
      ]);

      console.log("✅ Cache refresh completed, reloading page...");
      
      // Force a page reload after a short delay to ensure all caches are cleared
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error("❌ Failed to refresh cache:", error);
      setIsRefreshing(false);
    }
    // Don't set isRefreshing to false here since we're reloading the page
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Extensions")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {t("enhance_your_system_with_powerful_extensions")}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative">
          <Input
            placeholder="Search extensions"
            className="pl-9 w-full sm:w-[300px]"
            onChange={(e) => setFilter(e.target.value)}
            icon="mdi:search"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleRefreshCache}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Cache"}
        </Button>
      </div>
    </div>
  );
}
