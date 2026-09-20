interface NavColorSchema {
  // Primary color for active states, accents
  primary: string;
  // Secondary color for gradients, hover states
  secondary?: string;
  // Text colors
  text?: string;
  textHover?: string;
  textActive?: string;
  // Background colors
  bg?: string;
  bgHover?: string;
  bgActive?: string;
  // Border colors
  border?: string;
  borderActive?: string;
  // Gradient direction (for impressive effects)
  gradientDirection?: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';
  // Glow/shadow color
  glow?: string;
  // Indicator style for active items
  indicatorStyle?: 'underline' | 'pill' | 'glow' | 'gradient-underline' | 'dot';
}

interface MenuItem {
  key: string;
  title: string;
  href?: string;
  description?: string;
  icon?: string;
  image?: string;
  permission?: string | string[];

  child?: MenuItem[];
  megaMenu?: MenuItem[];
  multi_menu?: MenuItem[];
  nested?: MenuItem[];
  features?: string[];
  onClick?: () => void;

  extension?: string;
  settings?: string[];
  settingConditions?: Record<string, string>;
  env?: string;
  auth?: boolean;
  active?: boolean;
  disabled?: boolean;
  exact?: boolean; // If true, only match exact path (not startsWith)

  /**
   * `title` is already the final, display-ready label - do not translate it.
   *
   * By default SiteHeader ignores `title` and asks next-intl for
   * `<namespace>.<key-with-dashes-as-dots>.title` instead (see
   * components/partials/menu-translator.tsx), treating `title` as the English
   * fallback. Set this when the label cannot come from a key:
   *
   *   - the caller already resolved it with its own t() call;
   *   - it is an addon alias set by an admin (see config/menu.ts);
   *   - it is a value off a DB row (a product category name).
   *
   * Without it, menu-translator looks up a key that will never exist and logs
   * "[i18n] Missing translation" on every render.
   */
  _customTitle?: boolean;

  /**
   * `description` is already the final, display-ready sub-line - do not
   * translate it.
   *
   * Exactly the `_customTitle` contract, one field over. Set by the menu
   * override engine when an admin types a description in /admin/menus: that
   * text has no translation key, and without this flag `getDescription` in
   * components/partials/menu-translator.tsx looks one up on every render.
   */
  _customDescription?: boolean;

  // Color schema for theming navigation items
  colorSchema?: NavColorSchema;
}

interface GetFilteredMenuOptions {
  user?: any;
  settings: Record<string, string>;
  extensions: string[];
  activeMenuType?: "user" | "admin" | "guest" | string;
}
