"use client"; // Error components must be Client Components

import { ErrorBoundaryFallback } from "@/components/error/error-shell";

/**
 * Locale-wide error boundary — the last stop before `global-error.tsx`.
 *
 * `standalone`: when this boundary activates, every layout BELOW
 * `app/[locale]/layout.tsx` is unmounted, and that layout renders
 * `ConditionalLayoutProvider` with `isGuest`, which paints no header and no
 * footer. So there is no chrome to fit inside — the shell owns the viewport.
 *
 * This used to be `fixed inset-0 z-50` over a backdrop blur, which is a modal,
 * not a page: it left whatever had half-rendered visible underneath and could
 * not be scrolled past.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} />;
}
