import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Default site configuration values
const defaultSiteConfig = {
  radius: 0.5,
  navbarType: "sticky",
  footerType: "default",
};

interface ThemeStoreState {
  radius: number;
  setRadius: (value: number) => void;
  navbarType: string;
  setNavbarType: (value: string) => void;
  footerType: string;
  setFooterType: (value: string) => void;
  isRtl: boolean;
  setRtl: (value: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set) => ({
      radius: defaultSiteConfig.radius,
      setRadius: (value) => set({ radius: value }),
      setLayout: (_value) => {
        set({ navbarType: "sticky" });
      },
      navbarType: defaultSiteConfig.navbarType,
      setNavbarType: (value) => set({ navbarType: value }),
      // Map footerType "static" to "default"
      footerType: defaultSiteConfig.footerType,
      setFooterType: (value) => set({ footerType: value }),
      isRtl: false,
      setRtl: (value) => set({ isRtl: value }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: "theme-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface SidebarState {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  subMenu: boolean;
  setSubmenu: (value: boolean) => void;
  mobileMenu: boolean;
  setMobileMenu: (value: boolean) => void;
}

export const useSidebar = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (value) => set({ collapsed: value }),
      subMenu: false,
      setSubmenu: (value) => set({ subMenu: value }),
      mobileMenu: false,
      setMobileMenu: (value) => set({ mobileMenu: value }),
    }),
    { name: "sidebar-store", storage: createJSONStorage(() => localStorage) }
  )
);
