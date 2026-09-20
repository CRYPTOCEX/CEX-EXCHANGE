import { DynamicMenuView } from "@/components/partials/dashboard/dynamic-menu";
import { PageShell } from "@/components/layout/page-shell";
import React from "react";
export default function AdminCrmPage() {
  return (
    <PageShell rhythm="none">
      <DynamicMenuView />
    </PageShell>
  );
}
