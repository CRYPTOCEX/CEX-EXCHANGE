import { ArrowLeft, Info, Paperclip, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * THE SKELETON IS THE PAGE'S OWN FRAME, MINUS THE DOZEN STRINGS.
 * ===========================================================================
 *
 * This file used to be a `PageShell` full of gradient `Card`s in a 4-column
 * grid — the shape of a support screen that no longer exists. `page.tsx` is a
 * `h-screen w-screen` chat surface: one bar, one scroller, one composer, and an
 * optional 320px rail that starts closed. Nothing here matched it, so the
 * segment flipped from a card grid to a chat app the moment the payload landed.
 *
 * It also cannot use `PageShell`. The route is on the `CHROMELESS` list in
 * `admin/layout.tsx`, so no header is mounted, and `PageShell` defaults to
 * `clearance: true` (`pt-header-clear`, 6rem) — clearance for a bar that is not
 * there is just 96px of empty page above the skeleton.
 *
 * Geometry is copied from `page.tsx` deliberately: `h-14 md:h-16` bar, the same
 * borders and `bg-card/80`, the same composer padding. The transcript region is
 * left EMPTY for the reason `page.tsx` gives for its own at-rest state — a
 * conversation has no knowable length, its box is already fixed by the frame,
 * and fake bubbles would put words that are not in the ticket on an admin's
 * screen.
 */
export default function Loading() {
  return (
    <div className="h-screen w-screen bg-background flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar */}
        <div className="h-14 md:h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-3 md:px-4 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 shrink-0 flex items-center justify-center text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-full shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-40 sm:w-56" />
                <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
              </div>
              <Skeleton className="h-3 w-28 sm:w-44" />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Skeleton className="h-8 w-20 rounded-md hidden md:block" />
            <Skeleton className="h-8 w-20 rounded-md hidden md:block" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="h-8 w-8 flex items-center justify-center text-muted-foreground">
              <Info className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Transcript — intentionally empty; see the note above. */}
        <div className="flex-1 min-h-0" />

        {/* Composer */}
        <div className="border-t border-border bg-card/80 backdrop-blur-sm p-3 md:p-4 shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl flex items-center justify-center text-muted-foreground">
              <Paperclip className="h-5 w-5" />
            </div>
            <div className="flex-1 relative">
              <div className="min-h-10 md:min-h-11 rounded-xl bg-muted border border-border-strong" />
              <div className="absolute right-1.5 bottom-1.5 h-7 w-7 md:h-8 md:w-8 rounded-lg bg-primary/40 flex items-center justify-center">
                <Send className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
