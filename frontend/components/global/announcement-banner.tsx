"use client";

import { useMemo } from "react";
import { ExternalLink, Megaphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeHTMLPreview } from "@/lib/sanitize";
import {
  safeAnnouncementLink,
  useAnnouncementsStore,
  type AnnouncementRow,
} from "@/store/announcement-store";

/**
 * The surface an operator's announcement actually lands on.
 *
 * WHY A CARD AND NOT A TOAST OR THE BELL
 * --------------------------------------
 * A sonner toast auto-dismisses, and the frames that feed this arrive on
 * SUBSCRIBE — i.e. on every page load and every reconnect. A notice published
 * on Monday would toast again on Tuesday's first page view and be gone before
 * a slow reader finished it, with no way back to it.
 *
 * The bell is fed by `/api/user/notification`, whose rows have ids these do
 * not share; see the note in `store/announcement-store.ts`.
 *
 * So: an anchored card that stays until it is closed. It is FIXED rather than
 * inserted into the document flow because this mounts above every signed-in
 * route in `provider/providers.tsx` — a block in the flow would shift the
 * layout of several hundred pages, including the full-height trading
 * terminals, on a message the operator cannot preview.
 *
 * `bottom-start` is the free corner IN LTR, and the corner is genuinely
 * contested: the floating support bubble is `fixed end-4 bottom-4 z-50`
 * (`support/ticket/components/live-chat.tsx:508`) and sonner defaults to
 * `bottom-right` — `ui/sonner.tsx` passes no `position`. Note the two are not
 * the same axis: the bubble is LOGICAL (`end`), sonner is physical, so in RTL
 * the bubble moves to the left and the toasts do not. A toast can therefore
 * clip this card's corner in an RTL locale for the few seconds it is up.
 * Logical `start` is still the right call — the alternative pins the card
 * under the support bubble permanently, which is worse than being briefly
 * overlapped. `z-40` keeps this under both, and under every dialog.
 *
 * ONE AT A TIME. Dismissing reveals the next, which is its own progress
 * indicator and needs no counter string.
 */
export default function AnnouncementBanner() {
  const tCommon = useTranslations("common");
  const tComponents = useTranslations("components");

  const announcements = useAnnouncementsStore((state) => state.announcements);
  const dismissedIds = useAnnouncementsStore((state) => state.dismissedIds);
  const dismiss = useAnnouncementsStore((state) => state.dismiss);

  const current = useMemo<AnnouncementRow | null>(() => {
    const dismissed = new Set(dismissedIds);
    return (
      announcements.find(
        (row) => !dismissed.has(row.id) && (row.title || row.message)
      ) ?? null
    );
  }, [announcements, dismissedIds]);

  if (!current) return null;

  const href = safeAnnouncementLink(current.link);

  /*
    `message` is authored in the WYSIWYG editor and STORED AS HTML — the admin
    view dialog hit this first and says so at
    `admin/system/announcement/columns.tsx`. Printing it as text would show
    every reader `<p>Scheduled maintenance…</p>`, and printing it raw would
    hand an announcement author script in every signed-in session. The preview
    allowance is the right one for a card: it keeps p/br/strong/em/a and, with
    `KEEP_CONTENT`, the TEXT of everything it drops, so a heading or a list
    still reads even though its markup does not survive.
  */
  const messageHtml = current.message
    ? sanitizeHTMLPreview(String(current.message))
    : "";

  // The same three labels and the same three tones the operator saw on the
  // authoring table (`columns.tsx`), so the notice they published looks like
  // the row they published it from.
  const typeLabel =
    current.type === "EVENT"
      ? tCommon("event")
      : current.type === "UPDATE"
        ? tCommon("update")
        : tCommon("general");

  const typeTone =
    current.type === "EVENT"
      ? "success"
      : current.type === "UPDATE"
        ? "warning"
        : "primary";

  return (
    <div
      role="status"
      aria-live="polite"
      /* The anchoring and the surface are ONE literal on purpose. R3 puts depth
         in the surface ramp and exempts genuinely floating elements, and the
         scanner decides that per class literal — a shadow written on an inner
         wrapper reads as page-level debt however the parent is positioned. */
      className="fixed start-4 bottom-4 z-40 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl sm:start-6 sm:bottom-6"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-ink">
          <Megaphone className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge tone={typeTone} appearance="soft" size="xs">
              {typeLabel}
            </Badge>
          </div>

          {current.title ? (
            <h3 className="mt-1.5 text-sm font-semibold text-foreground break-words">
              {current.title}
            </h3>
          ) : null}

          {messageHtml ? (
            <div
              className={[
                "mt-1 text-sm leading-relaxed text-muted-foreground break-words",
                "[&_p]:mb-1 [&_p:last-child]:mb-0",
                "[&_a]:text-primary [&_a]:underline [&_a]:break-words",
                "[&_strong]:font-semibold [&_em]:italic",
              ].join(" ")}
              dangerouslySetInnerHTML={{ __html: messageHtml }}
            />
          ) : null}

          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {tCommon("learn_more")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="2xs"
          iconOnly
          onClick={() => dismiss(current.id)}
          title={tComponents("dismiss_announcement")}
          aria-label={tComponents("dismiss_announcement")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
