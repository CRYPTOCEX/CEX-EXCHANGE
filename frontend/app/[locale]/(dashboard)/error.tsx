"use client"; // Error components must be Client Components

import { ErrorBoundaryFallback } from "@/components/error/error-shell";

/**
 * Dashboard error boundary.
 *
 * `standalone={false}`: this renders inside `DashBoardLayoutProvider`, which
 * paints a `fixed top-0 z-50` header and a footer around `<main>`. `<main>`
 * itself has no padding — every dashboard page supplies its own `PAGE_PADDING`
 * (`pt-24 pb-16`) — and this boundary supplied none, so it rendered underneath
 * the header with the alert text sitting on top of the logo.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryFallback error={error} reset={reset} standalone={false} />
  );
}
