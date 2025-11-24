"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ------------------------------------------
// 1) Menu Types & Helpers
// ------------------------------------------
interface MenuItem {
  key: string;
  title: string;
  href?: string;
  icon?: any;
  child?: MenuItem[];
  megaMenu?: MenuItem[];
  permission?: string[];
  extension?: string;
  env?: string;
  settings?: string[];
  auth?: boolean;
  isHeader?: boolean;
}

// Normalize menu items ensuring `href` is always defined
function normalizeMenuItems(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const newItem: MenuItem = {
      ...item,
      href: typeof item.href === "string" ? item.href : "#",
      child: item.child ? normalizeMenuItems(item.child) : item.child,
      megaMenu: item.megaMenu
        ? normalizeMenuItems(item.megaMenu)
        : item.megaMenu,
    };
    return newItem;
  });
}

// Process menu to flatten any megaMenu items
function processSideMenu(normalizedMenu: MenuItem[]): MenuItem[] {
  if (!normalizedMenu) return [];
  return normalizedMenu.map((item) => {
    if (item.megaMenu && item.megaMenu.length > 0) {
      const combinedChild: MenuItem[] = [];
      for (const mm of item.megaMenu) {
        if (mm.child && mm.child.length > 0) {
          combinedChild.push(...mm.child);
        }
      }
      // Sort combinedChild alphabetically by title
      combinedChild.sort((a, b) => {
        const titleA = a.title?.toLowerCase() || "";
        const titleB = b.title?.toLowerCase() || "";
        return titleA.localeCompare(titleB);
      });

      return {
        ...item,
        child: combinedChild,
        megaMenu: undefined, // remove megaMenu once flattened
      };
    }
    return item;
  });
}

// ------------------------------------------
// 3) Combined Store
// ------------------------------------------

interface ConfigState {
  // Settings are now stored as an object
  settings: Record<string, any>;
  extensions: string[];
  isLoading: boolean;
  settingsFetched: boolean; // Track if settings have been successfully fetched
  settingsError: string | null; // Track fetch errors

  // Menu
  navMenu: MenuItem[] | null;
  sideMenu: MenuItem[] | null;

  // Actions
  setSettings: (settings: Record<string, any>) => void;
  setExtensions: (extensions: string[]) => void;
  updateSetting: (key: string, value: any) => void;
  setIsLoading: (isLoading: boolean) => void;
  setMenu: (menu: MenuItem[]) => void;
  setSettingsFetched: (fetched: boolean) => void;
  setSettingsError: (error: string | null) => void;
  resetSettings: () => void; // Reset settings state for retry
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // State
      settings: {},
      extensions: [],
      isLoading: false,
      settingsFetched: false,
      settingsError: null,

      navMenu: null,
      sideMenu: null,

      // Mutations
      setSettings: (settings) =>
        set({ settings, settingsFetched: true, settingsError: null }),
      setExtensions: (extensions) => set({ extensions }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setSettingsFetched: (fetched) => set({ settingsFetched: fetched }),
      setSettingsError: (error) => set({ settingsError: error }),

      // Reset settings state for retry
      resetSettings: () =>
        set({
          settings: {},
          extensions: [],
          settingsFetched: false,
          settingsError: null,
          navMenu: null,
          sideMenu: null,
        }),

      // Update or add a single setting
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),

      // Menu
      setMenu: (menu) => {
        const normalized = normalizeMenuItems(menu);
        const processed = processSideMenu(normalized);
        set({
          navMenu: normalized,
          sideMenu: processed,
        });
      },
    }),
    {
      name: 'bicrypto-config-store',
      partialize: (state) => ({
        settings: state.settings,
        extensions: state.extensions,
        navMenu: state.navMenu,
        sideMenu: state.sideMenu,
      }),
    }
  )
);
