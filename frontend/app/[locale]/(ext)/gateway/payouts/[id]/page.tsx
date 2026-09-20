import PayoutDetailClient from "./client";
import { PageShell } from "@/components/layout/page-shell";

export default function PayoutDetailPage() {
  /**
   * This page had no frame at all: it rendered `<PayoutDetailClient />` bare,
   * and the client's outermost element is a `space-y-6` with no container and
   * no top padding. So the content ran edge to edge and its first row sat under
   * the `fixed top-0 h-16` site header.
   *
   * `rhythm="none"` because the client already sets its own `space-y-6`;
   * PageShell supplies the container, gutter and header clearance only.
   */
  return (
    <PageShell rhythm="none">
      <PayoutDetailClient />
    </PageShell>
  );
}
