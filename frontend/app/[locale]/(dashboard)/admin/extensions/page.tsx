"use client";

import { DynamicMenuView } from "@/components/partials/dashboard/dynamic-menu";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

export default function ExtensionsPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <DynamicMenuView />
    </div>
  );
}
