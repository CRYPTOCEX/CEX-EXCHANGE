import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "E-commerce overview with sales analytics, order metrics, and inventory status.",
    href: "/admin/ecommerce",
    icon: "lucide:layout-dashboard",
    exact: true,
  },
  {
    key: "catalog",
    title: "Catalog",
    description: "Manage product catalog and inventory.",
    icon: "lucide:package",
    child: [
      {
        key: "products",
        title: "Products",
        description:
          "Create, edit, and manage products with pricing, inventory, and media management.",
        href: "/admin/ecommerce/product",
        icon: "lucide:package",
      },
      {
        key: "categories",
        title: "Categories",
        description:
          "Organize products into categories with hierarchy and navigation settings.",
        href: "/admin/ecommerce/category",
        icon: "lucide:tag",
      },
      {
        key: "reviews",
        title: "Reviews",
        description:
          "Moderate product reviews, respond to feedback, and manage ratings.",
        href: "/admin/ecommerce/review",
        icon: "lucide:star",
      },
      {
        key: "wishlist",
        title: "Wishlist",
        description: "View user wishlist trends and popular product analytics.",
        href: "/admin/ecommerce/wishlist",
        icon: "lucide:heart",
      },
    ],
  },
  {
    key: "sales",
    title: "Sales",
    description: "Manage sales operations and fulfillment.",
    icon: "lucide:shopping-bag",
    child: [
      {
        key: "orders",
        title: "Orders",
        description:
          "Process orders, manage fulfillment, and handle returns and exchanges.",
        href: "/admin/ecommerce/order",
        icon: "lucide:shopping-bag",
      },
      {
        key: "discounts",
        title: "Discounts",
        description:
          "Create promotional campaigns, discount codes, and special offers.",
        href: "/admin/ecommerce/discount",
        icon: "lucide:percent",
      },
      {
        key: "shipping",
        title: "Shipping",
        description:
          "Configure shipping methods, rates, and carrier integrations.",
        href: "/admin/ecommerce/shipping",
        icon: "lucide:truck",
      },
    ],
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Store configuration including payment methods, tax settings, and policies.",
    href: "/admin/ecommerce/settings",
    icon: "lucide:settings",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ecommerce;
