"use client";

import { Shield, ClipboardList, CalendarIcon, User, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tCommon("unique_identifier_for_the_order"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("user"),
      type: "compound",
      expandedTitle: (row) => `User: ${row.id}`,
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("customer_who_placed_the_order"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("customers_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
          },
        },
      },
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: ClipboardList,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_order_processing_status"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "PENDING":
                return "warning";
              case "COMPLETED":
                return "success";
              case "CANCELLED":
                return "destructive";
              case "REJECTED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "products",
      title: tExt("products"),
      type: "tags",
      icon: ShoppingBag,
      sortable: false,
      searchable: true,
      filterable: true,
      description: tExtAdmin("products_included_in_this_order"),
      priority: 2,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_order_was_placed"),
      render: { type: "date", format: "PPP" },
      priority: 2,
    },
  ];
}

// Orders are created by users, not in admin - only viewing and status editing
