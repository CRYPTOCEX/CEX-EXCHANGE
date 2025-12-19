"use client";
import { DynamicMenuView } from "@/components/partials/dashboard/dynamic-menu";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import React from "react";
export default function AdminCrmPage() {
  return (
    <div className={`container ${PAGE_PADDING}`}>
      <DynamicMenuView />
    </div>
  );
}
