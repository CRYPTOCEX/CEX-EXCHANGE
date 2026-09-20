"use client";

import { Shield, ClipboardList, User, Heart, CalendarIcon } from "lucide-react";
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
      description: tExtAdmin("unique_identifier_for_the_wishlist_entry"),
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
      description: tExtAdmin("customer_who_created_this_wishlist"),
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
      key: "products",
      title: tExt("products"),
      type: "tags",
      expandedTitle: (row) => `Products: ${row.id}`,
      icon: Heart,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("products_saved_in_the_customers_wishlist"),
      priority: 1,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_wishlist_was_created"),
      render: { type: "date", format: "PPP" },
      priority: 2,
    },
  ];
}

// Wishlists are created by users, not in admin - only viewing
