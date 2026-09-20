"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useGuidanceStore } from "@/store/guidance";
import {
  catalogueText,
  guideStopKey,
  guideTitleKey,
} from "@/lib/support/catalogue-text";

/**
 * The walkthrough the assistant draws on the customer's own screen.
 *
 * ---------------------------------------------------------------------------
 * A FIFTH OVERLAY, AND WHY IT IS NOT A REFACTOR OF THE OTHER FOUR
 * ---------------------------------------------------------------------------
 * There are already four spotlight overlays here — binary, spot pro, forex,
 * swap — and they are 80% the same file four times. Unifying them was the
 * obvious move and it is the wrong one to make from this feature:
 *
 *   They are not actually identical. Their step shapes have drifted (8 fields,
 *   8, 7, 6), one of them keys its live-CSS touch targets off the very
 *   `data-tour` attributes its tour uses, and the forex one carries a written
 *   argument for its z-index that a shared component would have to re-derive.
 *   Rewriting four working onboarding flows to serve a support feature is a
 *   large blast radius for no user-visible gain.
 *
 *   They already do the job on their own pages. This addon does not need to own
 *   them; it needs to be able to START them, which is one CustomEvent each —
 *   see `NATIVE_TOURS` in the host.
 *
 * So this one exists for the ~70 pages that have NO tour, where the alternative
 * is nothing at all. It is deliberately the smallest of the five: no completion
 * celebration, no progress persistence, no skip-versus-close distinction. A
 * guide is three to five stops long and was asked for thirty seconds ago.
 *
 * ---------------------------------------------------------------------------
 * THE RESOLVER IS THE PART THAT MATTERS
 * ---------------------------------------------------------------------------
 * `document.querySelector('[data-tour="x"]')` is what the other four do and it
 * is not sufficient here, because these anchors live on ordinary product pages
 * rather than on a single-purpose terminal:
 *
 *   RESPONSIVE DUPLICATES. The profile sidebar renders twice — a desktop copy
 *   inside `hidden lg:block` and a mobile copy inside a sheet. On a phone the
 *   desktop copy is first in document order and has a ZERO-SIZE box, so
 *   `querySelector` returns it and the spotlight draws a dot in the corner.
 *   So: every match, first one with real area.
 *
 *   LATE ARRIVAL. Half these anchors sit behind a fetch. The element is not
 *   there on the first frame and appears a few hundred milliseconds later, so
 *   a one-shot lookup permanently misses it. So: re-resolve on a short interval
 *   as well as on scroll and resize, exactly as the binary overlay learned to.
 *
 *   STEP-GATED PAGES. The deposit page renders rung two only once rung one is
 *   answered, and the profile security panel is UNMOUNTED until its tab is
 *   opened. A stop whose anchor is genuinely not on screen yet degrades to a
 *   centred card whose text tells the customer what to click — which is why the
 *   copy for those stops is written to stand on its own.
 */

const RESOLVE_INTERVAL_MS = 400;
const CARD_WIDTH = 340;
const CARD_HEIGHT = 240;
const EDGE = 16;

/**
 * The first element carrying this anchor that actually occupies space.
 *
 * Both attribute spellings, because two shipped terminals use `data-tutorial`
 * and rewriting them to serve this feature would be a change with real risk and
 * no user-visible benefit.
 */
function resolveAnchor(anchor: string): DOMRect | null {
  if (!anchor || typeof document === "undefined") return null;
  const matches = document.querySelectorAll(
    `[data-tour="${anchor}"], [data-tutorial="${anchor}"]`
  );
  for (const element of Array.from(matches)) {
    const rect = element.getBoundingClientRect();
    // Zero area means a hidden responsive copy, not the element the stop meant.
    if (rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

export default function GuidedTour() {
  const t = useTranslations("common");
  /*
   * The STOPS are the backend catalogue's, not this component's.
   *
   * `common` covers the buttons — close, previous, next, done. Everything the
   * customer actually reads on the card is a constant from `guides.ts`, and it
   * arrived here in English however the answer above it was written; `prompt.ts`
   * asks the model to answer in the customer's language, so a Spanish
   * conversation used to open an English walkthrough.
   *
   * The lookup is by the guide's own key and the stop's POSITION — a stop has no
   * key of its own, and its index is the identity the overlay already walks by.
   * Nothing the model wrote can reach either side of it; see
   * `lib/support/catalogue-text.ts`.
   */
  const ta = useTranslations("support_assistant");
  const active = useGuidanceStore((state) => state.active);
  const stopIndex = useGuidanceStore((state) => state.stopIndex);
  const next = useGuidanceStore((state) => state.next);
  const previous = useGuidanceStore((state) => state.previous);
  const dismiss = useGuidanceStore((state) => state.dismiss);

  const [rect, setRect] = useState<DOMRect | null>(null);

  const stop = active?.stops[stopIndex] ?? null;
  const total = active?.stops.length ?? 0;
  const isFirst = stopIndex === 0;
  const isLast = total > 0 && stopIndex === total - 1;

  /* Re-resolve on scroll, on resize, and on a short interval — see the header
     on late-arriving and step-gated anchors. */
  useEffect(() => {
    if (!stop) {
      setRect(null);
      return;
    }
    const find = () => setRect(resolveAnchor(stop.anchor));
    find();

    window.addEventListener("scroll", find, true);
    window.addEventListener("resize", find);
    const timer = setInterval(find, RESOLVE_INTERVAL_MS);
    return () => {
      window.removeEventListener("scroll", find, true);
      window.removeEventListener("resize", find);
      clearInterval(timer);
    };
  }, [stop]);

  /* Bring the anchor into view. A spotlight on an element below the fold is a
     dimmed screen with nothing highlighted on it. */
  useEffect(() => {
    if (!stop?.anchor) return;
    const element = document.querySelector(
      `[data-tour="${stop.anchor}"], [data-tutorial="${stop.anchor}"]`
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [stop]);

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
    },
    [dismiss, next, previous]
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, handleKey]);

  const position = useMemo(() => {
    const centred = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
    if (!rect || !stop || stop.side === "center") return centred;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let top: number;
    let left: number;

    switch (stop.side) {
      case "top":
        top = rect.top - CARD_HEIGHT - 16;
        left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - CARD_HEIGHT / 2;
        left = rect.left - CARD_WIDTH - 16;
        break;
      case "right":
        top = rect.top + rect.height / 2 - CARD_HEIGHT / 2;
        left = rect.right + 16;
        break;
      default:
        top = rect.bottom + 16;
        left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
    }

    // Clamp into the viewport, then flip above the anchor rather than off the
    // bottom — the failure the other overlays all had to fix separately.
    if (top + CARD_HEIGHT > viewportHeight - EDGE) {
      top = rect.top - CARD_HEIGHT - 16;
    }
    if (top < EDGE || top + CARD_HEIGHT > viewportHeight - EDGE) {
      return centred;
    }
    left = Math.max(EDGE, Math.min(left, viewportWidth - CARD_WIDTH - EDGE));

    return { top: `${top}px`, left: `${left}px`, transform: "none" };
  }, [rect, stop]);

  if (!active || !stop) return null;

  const title = catalogueText(ta, guideTitleKey(active.key), active.title);
  const stopTitle = catalogueText(
    ta,
    guideStopKey(active.key, stopIndex, "title"),
    stop.title
  );
  const stopBody = catalogueText(
    ta,
    guideStopKey(active.key, stopIndex, "body"),
    stop.body
  );

  /*
   * THE CONTROL IS NOT ON SCREEN YET, AND THE CARD SAYS SO.
   *
   * Deposit, withdraw and verification reveal one rung at a time — rung two does
   * not exist until rung one is answered. The overlay re-resolves every 400ms, so
   * the spotlight DOES snap on once the customer acts; what it could not do was
   * tell them that acting, rather than pressing Next, was the way forward.
   *
   * Measured in a browser before this existed: all four stops of the withdrawal
   * walkthrough drew a centred card with no highlight, because Next had been
   * pressed four times on a form nobody had filled in. The copy underneath —
   * "check this character by character" — was pointing at nothing.
   *
   * Shown only while the anchor is unresolved, and only when the catalogue has
   * something to say. A stop with no `reveal` degrades exactly as before.
   */
  const stopReveal =
    stop.anchor && !rect && stop.reveal
      ? catalogueText(ta, guideStopKey(active.key, stopIndex, "reveal"), stop.reveal)
      : null;

  return (
    <AnimatePresence>
      <m.div
        key="guided-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* The scrim, with a hole cut for the anchor. `--overlay` is dark in
            both themes, which is the whole point of a scrim. */}
        <div className="pointer-events-none fixed inset-0 z-[var(--z-tour-scrim)]">
          <svg className="h-full w-full">
            <defs>
              <mask id="guidance-spotlight">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {rect ? (
                  <rect
                    x={rect.left - 8}
                    y={rect.top - 8}
                    width={rect.width + 16}
                    height={rect.height + 16}
                    rx={8}
                    fill="black"
                  />
                ) : null}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="hsl(var(--overlay) / 0.6)"
              mask="url(#guidance-spotlight)"
            />
          </svg>

          {rect ? (
            <m.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="border-primary absolute rounded-lg border-2 shadow-[0_0_24px_hsl(var(--primary)/0.45)]"
              style={{
                top: rect.top - 8,
                left: rect.left - 8,
                width: rect.width + 16,
                height: rect.height + 16,
              }}
            />
          ) : null}
        </div>

        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="border-border bg-popover fixed z-[var(--z-tour-content)] w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border shadow-2xl"
          style={position}
        >
          <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="text-primary size-3.5 shrink-0" aria-hidden />
              <span className="truncate text-xs font-medium">
                {title}
              </span>
            </div>
            <Button
              variant="ghost"
              size="2xs"
              iconOnly
              onClick={dismiss}
              aria-label={t("close")}
              className="shrink-0"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <div className="p-4">
            <h3 className="mb-1.5 text-sm font-semibold">{stopTitle}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {stopBody}
            </p>

            {/* What to do to make this control appear. Only while it has not.
                Tinted rather than muted, because it is the one line on the card
                that is an instruction rather than an explanation. */}
            {stopReveal ? (
              <p className="mt-2 rounded-md border border-info/25 bg-info/5 px-2.5 py-1.5 text-xs leading-relaxed text-info-ink">
                {stopReveal}
              </p>
            ) : null}

            {/* Dots rather than a bar: three to five stops is a countable
                number, and a 20%-full progress bar reads as "this will take a
                while" on something that takes fifteen seconds. */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5" aria-hidden>
                {active.stops.map((_, index) => (
                  <span
                    key={index}
                    className={
                      index === stopIndex
                        ? "bg-primary h-1.5 w-4 rounded-full transition-all"
                        : index < stopIndex
                          ? "bg-primary/40 size-1.5 rounded-full transition-all"
                          : "bg-border size-1.5 rounded-full transition-all"
                    }
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {!isFirst ? (
                  <Button variant="secondary" size="2xs" onClick={previous}>
                    <ChevronLeft className="size-3.5" />
                    {t("previous")}
                  </Button>
                ) : null}
                <Button size="2xs" onClick={next}>
                  {isLast ? t("done") : t("next")}
                  {!isLast ? <ChevronRight className="size-3.5" /> : null}
                </Button>
              </div>
            </div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
