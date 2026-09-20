import { Suspense } from "react";
import UpdateApplicationClient from "./client";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

export default function UpdateApplicationPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <UpdateApplicationClient />
    </Suspense>
  );
}

/**
 * The Suspense fallback, built from the page it stands in for.
 * ============================================================================
 *
 * A Suspense fallback is unavoidably a second tree — that is what the boundary
 * is — so the only defence against drift is that every measurement in it comes
 * from the component it replaces rather than from a number typed here. This
 * one had none: it was seven `Skeleton` boxes (`h-10 w-10`, `h-8 w-64`,
 * `h-4 w-48`, `h-24`, `h-12`, `h-64`, `h-12`) inside
 * `container max-w-4xl mx-auto py-8 px-4`, and the client renders
 * `container max-w-4xl py-12`. So the fallback was 32px of vertical padding
 * against 48px and carried an extra `px-4` — the page moved horizontally as
 * well as vertically the moment the client mounted.
 *
 * The other numbers were no better: `h-8 w-64` stood in for a `text-3xl`
 * heading, whose line box is 36px rather than 32; `h-4 w-48` for a paragraph
 * with `mt-1`; and the `h-24` block for a notice whose height is a `p-4` card
 * around a 36px icon plate and two lines of copy.
 *
 * Everything below is the client's own markup with the strings withheld. The
 * back button, the heading and the notice are literals or `t()` calls that do
 * not depend on any fetch, so their boxes are drawn for real — the only thing
 * this boundary waits for is the client chunk itself.
 */
function LoadingSkeleton() {
  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-col gap-8">
        {/* Header — same `gap-4` row, same 40px circular button box. */}
        <div className="flex items-center gap-4">
          <div className="rounded-full h-10 w-10 bg-primary/10 shrink-0" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              <SkeletonText placeholder="Update Application" />
            </h1>
            <p className="text-muted-foreground mt-1">
              <SkeletonText placeholder="Provide the additional information needed for your verification" />
            </p>
          </div>
        </div>

        {/* Status notice — the tint, the rule and the icon plate are constant. */}
        <div className="bg-warning/10 border-l-4 border-l-warning p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="bg-warning/15 p-2 rounded-full mr-3">
              <div className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-warning-ink">
                <SkeletonText placeholder="Additional information required" />
              </h3>
              <p className="text-sm mt-1 text-warning-ink/80">
                <SkeletonText placeholder="A reviewer has asked for more detail before this application can proceed." />
              </p>
            </div>
          </div>
        </div>

        {/* Form card — three rows, matching the client's own pending form:
            a real label line over the Input's own `h-9 w-full rounded-md`. */}
        <div className="rounded-lg border border-border bg-card p-6">
          {[16, 11, 21].map((chars, i) => (
            <div key={i} className="relative mb-4">
              <span className="text-sm font-medium mb-1.5 block text-foreground">
                <SkeletonText chars={chars} />
              </span>
              <SkeletonBlock className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Update KYC Application",
  description: "Update your KYC application with additional information",
};
