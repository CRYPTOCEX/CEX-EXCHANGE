import {
  Settings,
  Monitor,
  Percent,
  Truck,
  LayoutGrid,
} from "lucide-react";
import { FieldDefinition, TabDefinition, TabColors } from "@/components/admin/settings";

// Tab definitions for ecommerce settings
export const ECOMMERCE_TABS: TabDefinition[] = [
  {
    id: "general",
    label: "General",
    icon: Settings,
    description: "Configure tax, shipping, and general store settings",
  },
  {
    id: "display",
    label: "Display",
    icon: Monitor,
    description: "Configure product display and layout settings",
  },
];

// Tab colors for ecommerce settings
export const ECOMMERCE_TAB_COLORS: Record<string, TabColors> = {
  general: {
    bg: "bg-orange-500/10",
    text: "text-orange-500",
    border: "border-orange-500/20",
    gradient: "from-orange-500/20 via-orange-400/10 to-transparent",
    glow: "shadow-orange-500/20",
    iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
  },
  display: {
    bg: "bg-pink-500/10",
    text: "text-pink-500",
    border: "border-pink-500/20",
    gradient: "from-pink-500/20 via-pink-400/10 to-transparent",
    glow: "shadow-pink-500/20",
    iconBg: "bg-gradient-to-br from-pink-500 to-pink-600",
  },
};

// Field definitions for ecommerce settings
export const ECOMMERCE_FIELD_DEFINITIONS: FieldDefinition[] = [
  // General Settings
  {
    key: "ecommerceTaxEnabled",
    label: "Enable Tax",
    type: "switch",
    description: "Enable tax calculation on orders",
    category: "general",
    subcategory: "Tax",
  },
  {
    key: "ecommerceDefaultTaxRate",
    label: "Default Tax Rate",
    type: "range",
    description: "Default tax rate applied to products",
    category: "general",
    subcategory: "Tax",
    min: 0,
    max: 30,
    step: 0.5,
    suffix: "%",
  },
  {
    key: "ecommerceShippingEnabled",
    label: "Enable Shipping",
    type: "switch",
    description: "Enable shipping calculations and options",
    category: "general",
    subcategory: "Shipping",
  },
  {
    key: "ecommerceDefaultShippingCost",
    label: "Default Shipping Cost",
    type: "number",
    description: "Default shipping cost for orders",
    category: "general",
    subcategory: "Shipping",
    min: 0,
    step: 0.01,
  },

  // Display Settings
  {
    key: "ecommerceProductsPerPage",
    label: "Products Per Page",
    type: "number",
    description: "Number of products displayed per page in listings",
    category: "display",
    subcategory: "Layout",
    min: 1,
    max: 100,
    step: 1,
  },
  {
    key: "ecommerceShowProductRatings",
    label: "Show Product Ratings",
    type: "switch",
    description: "Display product ratings and reviews",
    category: "display",
    subcategory: "Product Cards",
  },
  {
    key: "ecommerceShowRelatedProducts",
    label: "Show Related Products",
    type: "switch",
    description: "Display related products on product pages",
    category: "display",
    subcategory: "Product Pages",
  },
  {
    key: "ecommerceShowFeaturedProducts",
    label: "Show Featured Products",
    type: "switch",
    description: "Display featured products section on homepage",
    category: "display",
    subcategory: "Homepage",
  },
];

// Default settings values
export const ECOMMERCE_DEFAULT_SETTINGS: Record<string, any> = {
  ecommerceDefaultTaxRate: 10,
  ecommerceDefaultShippingCost: 10,
  ecommerceProductsPerPage: 12,
  ecommerceShowProductRatings: true,
  ecommerceShowRelatedProducts: true,
  ecommerceShowFeaturedProducts: true,
  ecommerceShippingEnabled: true,
  ecommerceTaxEnabled: true,
};
