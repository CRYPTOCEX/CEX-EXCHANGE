import { Skeleton } from "@/components/ui/skeleton";

/**
 * The route-transition frame for ONE conversation.
 *
 * ---------------------------------------------------------------------------
 * WITHOUT THIS FILE THE WRONG SKELETON DRAWS
 * ---------------------------------------------------------------------------
 * `loading.tsx` is a Suspense boundary for its segment AND everything nested
 * under it, so with no boundary here the nearest one is `../loading.tsx` — the
 * ticket LIST's. Opening a conversation therefore rendered the list's frame
 * first: a masthead band carrying `pt-header-clear`, a bucket bar and six list
 * rows, on a route that has no site header to clear and is not a list. Then it
 * was replaced wholesale by a full-viewport app page.
 *
 * A live end-to-end assertion caught it — the chromeless route was still
 * emitting header clearance in its server-rendered HTML — which is exactly the
 * class of defect that is invisible in review and obvious on a slow connection.
 *
 * So this mirrors the `EditorShell` the page settles into: a 48px bar, a
 * thread, and a composer. No clearance, no container, `h-screen` rather than
 * `min-h-screen`.
 */
export default function Loading() {
  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      {/* the bar */}
      <header className="border-border bg-card flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <Skeleton className="size-1.5 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-56 max-w-[40vw]" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          {/* the thread, in the real reading column */}
          <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
            <div className="mx-auto w-full max-w-3xl space-y-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`flex w-full gap-2.5 ${i === 1 ? "flex-row-reverse" : ""}`}
                >
                  <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
                  <div
                    className={`flex min-w-0 max-w-[min(42rem,80%)] flex-col gap-1 ${
                      i === 1 ? "items-end" : "items-start"
                    }`}
                  >
                    <Skeleton className="h-3 w-28" />
                    <Skeleton
                      className={`h-16 rounded-2xl ${i === 1 ? "w-48" : "w-72"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* the composer */}
          <div className="border-border bg-card/40 shrink-0 border-t px-4 py-3 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <Skeleton className="h-[104px] w-full rounded-xl" />
            </div>
          </div>
        </section>

        {/* ---- the resolution pane ------------------------------------
            THE FRAME DRAWS AT REST, THE CONTENTS DO NOT.

            The pane's width and its tab bar both depend on what the thread
            turns out to contain — 27rem with a resolution, 20rem at the floor —
            and neither is known yet. Guessing means the pane visibly resizes
            and grows a tab bar the instant the fetch lands, which reads as a
            layout bug rather than as loading.

            So: the narrow width and no tabs, which is the floor every ticket
            has. A ticket that turns out to have sources widens ONCE, into more
            space, which is the direction the eye forgives. */}
        {/* `w-96` MUST match the live pane in `page.tsx`. A skeleton drawn at a
            different width than the thing it stands in for is not a skeleton —
            it is the layout shift, moved one frame earlier. */}
        <aside className="border-border bg-card/40 hidden w-96 shrink-0 flex-col border-s xl:flex">
          <div className="border-border flex h-11 shrink-0 items-center border-b px-3">
            <Skeleton className="h-3 w-24" />
          </div>

          {/* the assignee block — the one thing the pane always has */}
          <div className="border-border border-b p-3">
            <div className="border-border bg-card flex items-start gap-2.5 rounded-lg border p-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-3">
            <Skeleton className="h-3 w-28" />
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="size-5 shrink-0 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}
