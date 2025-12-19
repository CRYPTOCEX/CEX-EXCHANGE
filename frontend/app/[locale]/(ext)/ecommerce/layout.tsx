"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import { ExtensionLayoutWrapper } from "@/components/layout/extension-layout-wrapper";
import { menu as baseMenu, authenticatedMenu, colorSchema, adminPath } from "./menu";
import { EcommerceHeaderControls } from "./components/header-controls";
import { useUserStore } from "@/store/user";
import { $fetch } from "@/lib/api";

type Category = {
  id: number;
  name: string;
  slug: string;
  status: boolean;
};

export default function EcommerceLayout({ children }: { children: ReactNode }) {
  const { user } = useUserStore();
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/ecommerce/category",
          silentSuccess: true,
        });
        if (!error && data) {
          setCategories(data.filter((c: Category) => c.status));
        }
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  // Build menu dynamically with categories and auth-based items
  const buildMenu = (): MenuItem[] => {
    const menu: MenuItem[] = [...baseMenu];

    // Find categories menu item and add children if categories exist
    const categoriesIndex = menu.findIndex((item) => item.key === "categories");
    if (categoriesIndex !== -1 && categories.length > 0) {
      menu[categoriesIndex] = {
        ...menu[categoriesIndex],
        child: [
          {
            key: "all-categories",
            title: "All Categories",
            href: "/ecommerce/category",
          },
          ...categories.map((category) => ({
            key: `cat-${category.slug}`,
            title: category.name,
            href: `/ecommerce/category/${category.slug}`,
          })),
        ],
      };
    }

    // Add authenticated menu items
    if (user) {
      menu.push(...authenticatedMenu);
    }

    return menu;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader
        menu={buildMenu()}
        colorSchema={colorSchema}
        adminPath={adminPath}
        rightControls={<EcommerceHeaderControls />}
      />
      <ExtensionLayoutWrapper landingPath="/ecommerce" mainClassName="flex-1 w-full">
        {children}
      </ExtensionLayoutWrapper>
    </div>
  );
}
