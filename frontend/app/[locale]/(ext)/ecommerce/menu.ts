import { NAV_COLOR_SCHEMAS } from "@/app/[locale]/(ext)/theme-config";

export const menu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/ecommerce",
    icon: "lucide:home",
    exact: true,
    description:
      "Discover premium products in our curated marketplace with secure payment options.",
  },
  {
    key: "products",
    title: "Products",
    href: "/ecommerce/product",
    icon: "lucide:package",
    description:
      "Browse our complete product catalog with filters, reviews, and detailed specifications.",
  },
  {
    key: "categories",
    title: "Categories",
    href: "/ecommerce/category",
    icon: "lucide:list",
    description:
      "Explore products organized by category for easier shopping experience.",
  },
];

export const authenticatedMenu: MenuItem[] = [
  {
    key: "orders",
    title: "Orders",
    href: "/ecommerce/order",
    icon: "lucide:shopping-bag",
    description:
      "Track your orders, view shipping status, and manage returns.",
  },
  {
    key: "shipping",
    title: "Shipping",
    href: "/ecommerce/shipping",
    icon: "lucide:truck",
    description:
      "Manage shipping addresses and view delivery tracking information.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.ecommerce;
export const adminPath = "/admin/ecommerce";
