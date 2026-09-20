import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";

/**
 * Web Storage for the browser, a no-op on the server.
 *
 * These two stores used to pass `() => localStorage` — the BARE global, not
 * `window.localStorage`. That worked by accident: on the server the identifier
 * was undeclared, `createJSONStorage` caught the ReferenceError and returned
 * undefined, and `persist` took its "storage is currently unavailable" branch
 * and skipped persistence. Node 26 removed the accident. It defines
 * `globalThis.localStorage` as a getter that emits
 *
 *     ExperimentalWarning: localStorage is not available because
 *     --localstorage-file was not provided
 *
 * and returns `undefined` WITHOUT throwing. So `createJSONStorage` no longer
 * catches anything: it hands back a wrapper object built over an undefined
 * storage, that object is truthy, `persist` skips the unavailable branch, and
 * the first getItem/setItem is a property read on undefined.
 *
 * Short-circuiting on `typeof window` fixes both halves — the Node global is
 * never touched, so the warning cannot fire, and persist gets a real object it
 * can call on either side. `window.localStorage` rather than the bare global on
 * purpose: it is unreachable on the server by construction, not by luck.
 *
 * The no-op returns null from getItem, so the server renders the same defaults
 * it rendered when persistence was "unavailable" — no hydration change.
 */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const webStorage = (): StateStorage =>
  typeof window === "undefined" ? noopStorage : window.localStorage;

/**
 * Default site configuration values — EXPORTED, and that matters.
 *
 * These are also the values the SERVER renders with, and the values the
 * client's HYDRATION render sees. That is not a coincidence of this file: for
 * a `persist`-ed store, `zustand/esm/middleware.mjs:378` overwrites
 * `api.getInitialState = () => configResult`, so the accessor returns THESE
 * defaults rather than whatever came out of localStorage; `zustand/esm/react.mjs`
 * passes that accessor as `useSyncExternalStore`'s `getServerSnapshot`, and
 * react-dom uses `getServerSnapshot` whenever `isHydrating`.
 *
 * The consequence worth knowing: reading this store THROUGH ITS BOUND HOOK is
 * hydration-safe by construction — the first render always sees the values
 * below, never the user's persisted ones.
 *
 * It is exported because `components/partials/footer/index.tsx` and
 * `components/partials/header/index.tsx` each hand-copied one of these values
 * into a local `SERVER_*_TYPE` constant. Those copies are load-bearing: the
 * unguarded first render reads the value below automatically, so if a copy
 * ever drifted from it, the component would CREATE the hydration mismatch its
 * guard exists to prevent. Derive from this; do not retype it.
 */
export const defaultSiteConfig = {
  radius: 0.5,
  navbarType: "sticky",
  footerType: "default",
} as const;

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
      storage: createJSONStorage(webStorage),
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
    { name: "sidebar-store", storage: createJSONStorage(webStorage) }
  )
);
