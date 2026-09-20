import { DynamicMenuView } from "@/components/partials/dashboard/dynamic-menu";
import { PageShell } from "@/components/layout/page-shell";

export default function ExtensionsPage() {
  return (
    <PageShell rhythm="none">
      <DynamicMenuView />
    </PageShell>
  );
}
