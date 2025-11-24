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
  onClick?: () => void;

  extension?: string;
  settings?: string[];
  settingConditions?: Record<string, string>;
  env?: string;
  auth?: boolean;
  active?: boolean;
  disabled?: boolean;
}

interface GetFilteredMenuOptions {
  user?: any;
  settings: Record<string, string>;
  extensions: string[];
  activeMenuType?: "user" | "admin" | "guest" | string;
}
