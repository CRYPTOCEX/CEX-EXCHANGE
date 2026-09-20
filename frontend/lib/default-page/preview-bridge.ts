"use client";

/**
 * The channel the page editor uses to paint its draft into a real page.
 * ============================================================================
 *
 * WHY A BRIDGE AND NOT A MOCK-UP
 *
 * Every section editor used to ship its own hand-drawn approximation of the
 * section it edits, and all nine had drifted from the page: the Market editor
 * previewed a "Live Markets" panel that exists nowhere on the site, the Hero
 * editor previewed 2024 prices out of a `MOCK_ASSETS` constant, and the
 * README's line-number table pointed into a version of `home.tsx` that is 500
 * lines shorter than the current one. A mock-up can only ever prove the mock-up
 * renders. The question an owner is asking is "what does MY home page look like
 * if I change this", and the only thing that answers it is the home page.
 *
 * So the workspace frames the real route and the editor posts the draft in.
 *
 * WHY THIS IS NOT NEW ATTACK SURFACE. Two gates, both required, exactly as the
 * chrome preview does it:
 *
 *   1. `window.parent !== window` — nothing is listening unless this document
 *      is framed. A visitor on the real site never installs the handler.
 *   2. `event.origin === window.location.origin` — only our own pages.
 *
 * Past those gates the sender is a same-origin parent document, which can
 * already reach into this frame through `contentWindow` and set anything it
 * likes. This grants a capability that origin already had, through one narrow
 * declared message instead of arbitrary scripting.
 *
 * THE WHOLE DOCUMENT TRAVELS, not a per-section diff. The chrome preview
 * learned this the hard way: its message started as two ids, and when menu and
 * footer editing landed those fields were simply absent, so the frame filled
 * them with defaults and confidently showed an unedited menu while the editor
 * showed the edits. A preview that disagrees with the editor is worse than no
 * preview.
 */

import * as React from "react";

export const PAGE_PREVIEW_MESSAGE = "mashdiv:page-preview";

export interface PagePreviewMessage {
  type: typeof PAGE_PREVIEW_MESSAGE;
  /** Which page the payload belongs to, so a stray message cannot cross wires. */
  pageId: string;
  /** `variables` for `home`; ignored by pages whose content is a document. */
  variables?: Record<string, unknown> | null;
  /** The HTML body, for the pages stored as `content`. */
  content?: string | null;
  /**
   * The section the editor is working in. The frame scrolls to it, so picking
   * "Getting started" in the rail brings that band into view instead of leaving
   * the owner to hunt for it 4,000 pixels down a scaled iframe.
   */
  focusSection?: string | null;
}

/** Sections announce themselves with this, so `focusSection` has something to find. */
export function previewSectionProps(section: string) {
  return { "data-preview-section": section } as const;
}

/**
 * Listen for the editor's draft. Returns `null` on the real site, always.
 *
 * The `null` return is what makes this safe to call unconditionally from a page
 * component: unframed, the effect returns before installing anything and the
 * state never leaves its initial value, so the page renders exactly as it does
 * today with one unused state cell.
 */
export function usePagePreview(pageId: string): PagePreviewMessage | null {
  const [preview, setPreview] = React.useState<PagePreviewMessage | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as Partial<PagePreviewMessage> | null;
      if (!data || data.type !== PAGE_PREVIEW_MESSAGE) return;
      if (data.pageId !== pageId) return;
      setPreview(data as PagePreviewMessage);
    };

    window.addEventListener("message", onMessage);
    /* Tell the parent this document is ready to be painted. An optimisation on
       top of the editor's retry burst, never a precondition — measured
       behaviour on the chrome preview was that this announcement sometimes
       never arrived while the listener above worked perfectly. */
    window.parent.postMessage(
      { type: `${PAGE_PREVIEW_MESSAGE}:ready`, pageId },
      window.location.origin
    );

    return () => window.removeEventListener("message", onMessage);
  }, [pageId]);

  return preview;
}

/**
 * Scroll the named section into view when the editor changes rail.
 *
 * Deliberately `auto` and not `smooth`: the frame is scaled, the owner is
 * looking at the panel rather than the workspace while they click, and a
 * 500ms animation they do not watch is 500ms in which the preview shows the
 * wrong band. `nearest` so a section already on screen does not jump.
 */
export function usePreviewSectionFocus(focusSection: string | null | undefined) {
  React.useEffect(() => {
    if (!focusSection || typeof document === "undefined") return;
    const target = document.querySelector(`[data-preview-section="${CSS.escape(focusSection)}"]`);
    if (!target) return;
    /* One frame's grace: the section may have only just rendered as a result of
       the same message that asked for the scroll. */
    const id = requestAnimationFrame(() =>
      target.scrollIntoView({ block: "start", behavior: "auto" })
    );
    return () => cancelAnimationFrame(id);
  }, [focusSection]);
}
