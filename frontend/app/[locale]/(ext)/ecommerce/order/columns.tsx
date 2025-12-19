"use client";
import {
  Shield,
  Package,
  CalendarIcon,
  ShoppingBag,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

import { useTranslations } from "next-intl";
export function useColumns() {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return [
  {
    key: "id",
    title: tExt("order_id"),
    type: "text",
    icon: Shield,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("unique_identifier_for_your_order"),
    priority: 3,
    expandedOnly: true,
  },
  {
    key: "products",
    title: tExt("products"),
    type: "tags",
    icon: ShoppingBag,
    sortable: false,
    searchable: true,
    filterable: true,
    description: t("items_included_in_this_order"),
    priority: 1,
  },
  {
    key: "status",
    title: tCommon("order_status"),
    type: "select",
    icon: Package,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("current_delivery_status_of_your_order"),
    options: [
      { value: "PENDING", label: tCommon("pending") },
      { value: "PROCESSING", label: tCommon("processing") },
      { value: "SHIPPED", label: t("shipped") },
      { value: "DELIVERED", label: tExt("delivered") },
      { value: "CANCELLED", label: tCommon("cancelled") },
    ],
    priority: 1,
    render: {
      type: "badge",
      config: {
        variant: (value) => {
          const statusKey = value.toLowerCase();
          const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

          if (validStatuses.includes(statusKey)) {
            return "custom";
          }
          return "secondary";
        },
        className: (value) => {
          const statusKey = value.toLowerCase();

          switch (statusKey) {
            case 'pending':
              return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 border';
            case 'processing':
              return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 border';
            case 'shipped':
              return 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 border';
            case 'delivered':
              return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 border';
            case 'cancelled':
              return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 border';
            default:
              return "";
          }
        },
      },
    },
  },
  {
    key: "total",
    title: tCommon("total_amount"),
    type: "number",
    icon: DollarSign,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("total_cost_of_your_order_including"),
    priority: 2,
    render: {
      type: "currency",
    },
  },
  {
    key: "createdAt",
    title: t("order_date"),
    type: "date",
    icon: CalendarIcon,
    sortable: true,
    searchable: true,
    filterable: true,
    description: t("date_when_you_placed_this_order"),
    render: { type: "date", format: "PPP" },
    priority: 2,
  },
] as ColumnDefinition[];
}
