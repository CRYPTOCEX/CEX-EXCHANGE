"use client";

/**
 * A scaled, same-origin preview of a real page, with the plumbing that took
 * three attempts to get right.
 * ============================================================================
 *
 * Extracted from `site-preview.tsx` once a second screen needed it. The rules
 * below were all established by measurement, and a re-implementation would have
 * had to rediscover every one of them:
 *
 * VIEWPORTS ARE PINNED TO REAL PIXELS AND THEN SCALED, never `width: 100%`.
 * A studio workspace is around 1100px wide, Tailwind's `xl` is 1280, and the
 * site's desktop navigation is `xl:flex` — so a full-width frame renders the
 * MOBILE header and every desktop-only decision previews as identical. Pinning
 * to 1440 and scaling the whole frame keeps the site's own breakpoints honest.
 *
 * PAINTING IS A RETRY BURST, NOT A HANDSHAKE. Anything posted into the frame
 * before it has hydrated is dropped silently — no error, no warning — and the
 * page simply keeps showing its saved state, which reads as the editor ignoring
 * clicks. An earlier build made the frame's own "ready" announcement a
 * PRECONDITION and the measured behaviour was that it sometimes never arrived
 * while the frame's listener worked perfectly. So the announcement is an
 * optimisation (`bump()`) and correctness rests on a short burst of retries.
 *
 * "LOADING" IS DRIVEN FROM `readyState`, NOT FROM THE `load` EVENT. A single
 * event that fires before its handler is attached leaves the flag stuck
 * forever; the symptom was a pill sitting over a fully rendered page.
 *
 * THE MEASURED ELEMENT IS `absolute inset-0`, so it takes its size FROM the
 * layout and can never contribute to it. Observing an element that the scaled
 * frame also sizes is a resize loop.
 */

import * as React from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export const PREVIEW_DEVICES = [
  { id: "desktop", label: "Desktop — 1440px", width: 1440, icon: Monitor },
  { id: "tablet", label: "Tablet — 834px", width: 834, icon: Tablet },
  { id: "phone", label: "Phone — 390px", width: 390, icon: Smartphone },
] as const;

export type PreviewDeviceId = (typeof PREVIEW_DEVICES)[number]["id"];

export interface PreviewFrameHandle {
  /** Re-run `onPaint` now — for a change the parent knows about immediately. */
  repaint: () => void;
  /** Throw the document away and load it again. */
  reload: () => void;
  document: () => Document | null;
  window: () => Window | null;
}

export const PreviewFrame = React.forwardRef<
  PreviewFrameHandle,
  {
    src: string;
    /**
     * Push the draft into the frame. Called on load, on every burst tick, and
     * whenever its own identity changes — so it MUST be a `useCallback` whose
     * deps are exactly the draft it reads, and it must be idempotent.
     */
    onPaint?: (doc: Document, win: Window) => void;
    /** Rendered at the start of the toolbar, before the device buttons. */
    toolbarStart?: React.ReactNode;
    /** Rendered just before the reload/open cluster at the end. */
    toolbarEnd?: React.ReactNode;
    /** A strip under the toolbar — for "this page has no footer" style caveats. */
    note?: React.ReactNode;
    /** Bumping this remounts the iframe. */
    reloadKey?: number;
    /**
     * The host does not yet know WHICH page this is.
     *
     * Everything in this component except the document itself is knowable before
     * that answer arrives — the toolbar, the three device buttons, the scale
     * readout, the note strip, the scaled frame box — so a host that is still
     * fetching renders all of it and gets a placeholder where the page will be.
     * The alternative it replaced was a centred spinner INSTEAD of the whole
     * component, which threw away a toolbar that never depended on the fetch.
     *
     * It is not a substitute for the frame's own "Loading preview…" pill: that
     * one covers a document that is loading, this one covers not knowing which
     * document to load. Both can be true, in that order.
     */
    pending?: boolean;
    className?: string;
  }
>(function PreviewFrame(
  { src, onPaint, toolbarStart, toolbarEnd, note, reloadKey = 0, pending = false, className },
  ref
) {
  const tComponents = useTranslations("components");
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [device, setDevice] = React.useState<PreviewDeviceId>("desktop");
  const [nonce, setNonce] = React.useState(0);
  const [paintToken, setPaintToken] = React.useState(0);
  const [box, setBox] = React.useState({ width: 0, height: 0 });

  /**
   * "Loaded" is a comparison, not a flag.
   *
   * The iframe is remounted whenever this key changes, so a boolean would stay
   * `true` from the PREVIOUS document across the swap and the pill would never
   * appear for the new one — and resetting it from an effect on `src` is a
   * cascading render for something that is simply derived.
   */
  const frameKey = `${nonce}-${reloadKey}-${src}`;
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);
  const loaded = loadedKey === frameKey;

  const paint = React.useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!win || !doc) return;
    onPaint?.(doc, win);
    if (doc.readyState === "complete") setLoadedKey(frameKey);
  }, [frameKey, onPaint]);

  /* Paint now, then again over the next few seconds. Five cheap calls, and it
     removes the entire "preview stuck on the saved value" class of bug. A
     convergence burst, not a polling loop — it terminates. */
  React.useEffect(() => {
    const timers = [150, 400, 900, 1800, 3200].map((ms) => setTimeout(paint, ms));
    paint();
    return () => timers.forEach(clearTimeout);
  }, [paint, paintToken, nonce, reloadKey]);

  React.useImperativeHandle(
    ref,
    () => ({
      repaint: () => setPaintToken((t) => t + 1),
      reload: () => setNonce((n) => n + 1),
      document: () => frameRef.current?.contentDocument ?? null,
      window: () => frameRef.current?.contentWindow ?? null,
    }),
    []
  );

  const handleLoad = React.useCallback(() => {
    setLoadedKey(frameKey);
    setPaintToken((t) => t + 1);
  }, [frameKey]);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setBox({ width: r.width, height: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeDevice = PREVIEW_DEVICES.find((d) => d.id === device) ?? PREVIEW_DEVICES[0];

  /** See the comment at its use site — this is about `src`, not about waiting. */
  const canMountFrame = !pending;

  /* Only ever scale DOWN — blowing a 390px phone viewport up to fill a 1200px
     panel would show text at a size no phone renders. */
  const scale = box.width > 0 ? Math.min(1, box.width / activeDevice.width) : 1;
  const scaledWidth = Math.round(activeDevice.width * scale);
  const logicalHeight = box.height > 0 ? Math.round(box.height / scale) : 900;
  const scalePercent = Math.round(scale * 100);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex h-9 shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-card px-2">
        {toolbarStart}

        <div className="flex items-center gap-0.5">
          {PREVIEW_DEVICES.map((d) => (
            <Button
              key={d.id}
              size="sm"
              variant="ghost"
              className={cn("h-7 w-7 p-0", device === d.id && "bg-muted text-foreground")}
              onClick={() => setDevice(d.id)}
              aria-label={d.label}
              title={d.label}
              aria-pressed={device === d.id}
            >
              <d.icon className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ))}
        </div>

        {/* Say the frame is scaled. Without it an owner measuring the preview
            against a ruler concludes the site renders small. */}
        <span className="text-[10px] tabular-nums text-subtle-foreground">
          {activeDevice.width}
          {scalePercent < 100 ? ` · ${scalePercent}%` : ""}
        </span>

        {toolbarEnd}

        <div className="ms-auto flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setNonce((n) => n + 1)}
            aria-label={tComponents("reload_preview")}
            title={tComponents("reload_preview")}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          {/* Opens the SAVED page, not the draft — the draft only exists inside
              the frame. Labelled so that is not a surprise.

              While `pending` there is no `src` to open, and an <a href=""> is
              not inert — it reloads the admin screen. So the same 28px box
              renders as a disabled button instead of a link: identical
              geometry, no destination. */}
          {pending ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              disabled
              aria-label={tComponents("open_the_live_page_in_a_new_tab")}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                title="Open the live page in a new tab (shows what is saved, not this draft)"
                aria-label={tComponents("open_the_live_page_in_a_new_tab")}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {note ? (
        <div className="shrink-0 border-b border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
          {note}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 p-3">
        <div ref={wrapRef} className="relative min-w-0 flex-1">
          <div className="absolute inset-0 flex justify-center">
            <div
              className="relative h-full overflow-hidden rounded-lg border border-border bg-card transition-[width] duration-300 ease-out"
              style={{ width: scaledWidth }}
            >
              {/* The frame BOX above is what reserves the space — `h-full` at
                  the scaled width, the same rectangle in both states — so the
                  swap inside it moves nothing.

                  `canMountFrame` is named rather than spelled `!pending`
                  inline, because the reason is not "hide the preview while it
                  loads". An <iframe src=""> resolves to the CURRENT document,
                  so mounting it before a page has been chosen would load this
                  admin screen inside itself: a second copy of the studio,
                  fetching its own data, at 1440px scaled down. The frame cannot
                  exist until there is somewhere to point it. */}
              {canMountFrame ? (
                <iframe
                  key={frameKey}
                  ref={frameRef}
                  src={src}
                  onLoad={handleLoad}
                  title={tComponents("live_preview_with_the_current_draft")}
                  className="border-0"
                  style={{
                    width: activeDevice.width,
                    height: logicalHeight,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                  /* Same origin, our own page, our own scripts — nothing to
                     sandbox against that is not already trusted on this domain,
                     and sandboxing would break the channel this depends on. */
                />
              ) : (
                <SkeletonBlock className="h-full w-full rounded-none" />
              )}
              {/* The frame's own pill, for a document that IS loading. It has
                  nothing to say while there is no document to load — that state
                  is the pulse above. */}
              {canMountFrame && !loaded ? (
                <div className="pointer-events-none absolute bottom-2 end-2">
                  <span className="rounded-full border border-border bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
                    {tComponents("loading_preview")}…
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

/** The light/dark pair the preview toolbars share, so they cannot word it differently. */
export function PreviewSchemeToggle({
  scheme,
  onChange,
}: {
  scheme: "light" | "dark";
  onChange: (s: "light" | "dark") => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {(
        [
          ["light", "Light"],
          ["dark", "Dark"],
        ] as const
      ).map(([id, label]) => (
        <Button
          key={id}
          size="sm"
          variant="ghost"
          className={cn("h-7 px-2 text-[11px]", scheme === id && "bg-muted text-foreground")}
          onClick={() => onChange(id)}
          aria-pressed={scheme === id}
          title={label}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
