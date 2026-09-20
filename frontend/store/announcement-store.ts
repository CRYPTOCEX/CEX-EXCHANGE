import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * THE WEB CONSUMER FOR `type: "announcements"`.
 *
 * The producer was never the missing half. `backend/src/api/user/index.ws.ts:44`
 * answers the very SUBSCRIBE frame `provider/websocket.provider.tsx` already
 * sends with every `status: true` announcement, and the six admin routes under
 * `api/admin/system/announcement/` push each change through
 * `handleBroadcastMessage`, which reaches EVERY socket registered on
 * `/api/user` — `broadcastToRoute` iterates the route's clients with no
 * subscription key involved (`handler/ws/messageBroker.ts:217`). So the frames
 * were arriving at the browser and being dropped: the only `on("message")`
 * handler in the app tested `msg.stream === "notification"` and returned.
 *
 * Nothing here subscribes to anything. Adding a second socket, or a second
 * SUBSCRIBE, would be inventing a channel that already exists.
 *
 * WHY THIS IS NOT THE NOTIFICATION STORE
 * --------------------------------------
 * An announcement is not a `notification` row. It has no `userId`, no `read`
 * column and no `/api/user/notification/:id/*` endpoints behind it, so folding
 * these into `notification-store` would put ids in the bell that `markAsRead`
 * and `deleteNotification` would 404 on, and would corrupt the unread count
 * the badge is computed from. Same machinery — a zustand store fed by the
 * shared `/api/user` socket, `persist`ed for the one per-viewer preference —
 * kept as its own list.
 */

/**
 * The row as it comes off the wire. Declared here rather than added to
 * `types/models.d.ts`, which carries no announcement entry today.
 */
export interface AnnouncementRow {
  id: string;
  type?: "GENERAL" | "EVENT" | "UPDATE";
  title?: string;
  message?: string;
  link?: string | null;
  status?: boolean;
  createdAt?: string | Date;
}

/**
 * Every shape `handleBroadcastMessage` can put on the wire for this type.
 *
 * - `create` carries EITHER an array (the SUBSCRIBE hydration, and the bulk
 *   status route when it switches several rows on) OR one record (the create
 *   route, and the single status route switching one row on).
 * - `update` carries `{ id, data }` — never a whole record.
 * - `delete` carries `{ id }` or `[{ id }, …]`, and is also what a status flip
 *   to `false` arrives as: `processWebSocketMessage` rewrites the method
 *   rather than sending an update.
 */
export type AnnouncementMessage = {
  method?: "create" | "update" | "delete";
  payload?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asRows = (payload: unknown): Record<string, unknown>[] =>
  (Array.isArray(payload) ? payload : [payload]).filter(isRecord);

const idOf = (row: Record<string, unknown>): string | null =>
  typeof row.id === "string" && row.id.length > 0 ? row.id : null;

const time = (row: AnnouncementRow): number => {
  const value = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
  return Number.isNaN(value) ? 0 : value;
};

/** Newest first, the order the producer's own `findAll` asks for. */
const byNewest = (rows: AnnouncementRow[]): AnnouncementRow[] =>
  [...rows].sort((a, b) => time(b) - time(a));

/**
 * Merge an update's `data` onto the row we hold — the five columns the edit
 * route sends, and nothing else.
 *
 * `[id]/index.put.ts` builds `{ type, title, message, link, status }` out of
 * the request body, so every key is PRESENT and any the caller omitted is
 * `undefined`. A plain spread copies those undefineds over live values and
 * blanks the card, so each field is taken only when it arrived with a value of
 * the right kind.
 */
const mergeDefined = (
  base: AnnouncementRow,
  patch: Record<string, unknown>
): AnnouncementRow => ({
  ...base,
  ...(typeof patch.type === "string"
    ? { type: patch.type as AnnouncementRow["type"] }
    : {}),
  ...(typeof patch.title === "string" ? { title: patch.title } : {}),
  ...(typeof patch.message === "string" ? { message: patch.message } : {}),
  // `null` is how the edit form clears a link, and it has to survive.
  ...(typeof patch.link === "string" || patch.link === null
    ? { link: patch.link as string | null }
    : {}),
  ...(typeof patch.status === "boolean" ? { status: patch.status } : {}),
});

/**
 * The reducer, pure and exported so it can be driven without a socket.
 *
 * `status === false` is filtered on every path, not only on delete: the edit
 * route broadcasts the submitted body verbatim, so switching a notice off
 * through the edit form arrives as an ordinary update carrying `status: false`.
 */
export function applyAnnouncementMessage(
  current: AnnouncementRow[],
  msg: AnnouncementMessage
): AnnouncementRow[] {
  const { method, payload } = msg;

  if (method === "delete") {
    const gone = new Set(
      asRows(payload)
        .map(idOf)
        .filter((id): id is string => id !== null)
    );
    if (gone.size === 0) return current;
    return current.filter((row) => !gone.has(row.id));
  }

  if (method === "update") {
    if (!isRecord(payload)) return current;
    const id = typeof payload.id === "string" ? payload.id : null;
    const data = isRecord(payload.data) ? payload.data : null;
    if (!id || !data) return current;

    if (data.status === false) return current.filter((row) => row.id !== id);

    const existing = current.find((row) => row.id === id);
    if (existing) {
      return current.map((row) =>
        row.id === id ? mergeDefined(row, data) : row
      );
    }
    // Switched back on, or edited while we were connected but never hydrated.
    // Only worth adding if the broadcast carried something to show.
    if (typeof data.title !== "string" && typeof data.message !== "string") {
      return current;
    }
    // `id` last: the patch is a request body and has no business renaming the
    // record the broadcast said it was about.
    return byNewest([{ ...mergeDefined({ id }, data), id }, ...current]);
  }

  if (method === "create") {
    const incoming = asRows(payload)
      .map((row) => {
        const id = idOf(row);
        return id ? ({ ...row, id } as AnnouncementRow) : null;
      })
      .filter((row): row is AnnouncementRow => row !== null)
      .filter((row) => row.status !== false);
    if (incoming.length === 0) return current;

    const incomingIds = new Set(incoming.map((row) => row.id));
    return byNewest([
      ...incoming,
      ...current.filter((row) => !incomingIds.has(row.id)),
    ]);
  }

  return current;
}

/**
 * A `link` is a plain 255-char column an administrator typed, and it is about
 * to become an `href` in every signed-in user's browser — so `javascript:` and
 * friends are refused rather than rendered. Absolute http(s) and mailto links
 * pass; so does a site-relative path, which is how an operator points at their
 * own page. Anything else yields null and the card simply has no link.
 */
export function safeAnnouncementLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  const trimmed = link.trim();
  if (!trimmed) return null;

  // Protocol-relative (`//host`) and the slash-folding variant both leave the
  // origin without naming a scheme.
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
  if (trimmed.startsWith("/")) {
    // `/javascript:alert(1)` is a path to some parsers and a scheme to others.
    return /^\/[a-z][a-z0-9+.-]*:/i.test(trimmed) ? null : trimmed;
  }

  return /^(?:https?|mailto):/i.test(trimmed) ? trimmed : null;
}

/**
 * Dismissals are capped rather than pruned against the live set.
 *
 * Pruning would need to know that an incoming array is the WHOLE active set,
 * and it cannot: the SUBSCRIBE hydration and the bulk status route put the
 * same `create` + array frame on the wire, so treating the bulk one as
 * authoritative would forget dismissals for every notice it did not mention —
 * which the viewer sees as announcements they had already closed coming back.
 * A cap keeps the key bounded with no way to be wrong about it.
 */
const MAX_DISMISSED = 200;

interface AnnouncementsState {
  announcements: AnnouncementRow[];
  dismissedIds: string[];
  handleAnnouncementMessage: (msg: AnnouncementMessage) => void;
  dismiss: (id: string) => void;
}

export const useAnnouncementsStore = create<AnnouncementsState>()(
  persist(
    (set, get) => ({
      announcements: [],
      dismissedIds: [],

      handleAnnouncementMessage: (msg: AnnouncementMessage) => {
        const current = get().announcements;
        const next = applyAnnouncementMessage(current, msg);
        // The reducer returns the SAME array when a frame changes nothing, so
        // an admin editing an inactive notice does not re-render every screen.
        if (next !== current) set({ announcements: next });
      },

      dismiss: (id: string) => {
        const { dismissedIds } = get();
        if (!id || dismissedIds.includes(id)) return;
        set({ dismissedIds: [...dismissedIds, id].slice(-MAX_DISMISSED) });
      },
    }),
    {
      /*
        localStorage, deliberately.

        This is one fact per viewer per notice — "I have read this" — and
        nothing on the platform audits it: there is no announcement receipt
        table, no admin screen that counts reads, and no report that would be
        wrong without it (`announcementRead` appears nowhere in the repo).
        Giving it a model, a migration and a route would be building an
        operator feature nobody asked for inside a defect fix.

        The failure mode is the safe one. A new browser, a new device or
        cleared site data shows the notice AGAIN; it never hides one the viewer
        has not seen. For a platform-wide message that is the direction to fail
        in — and it is the same trade `notification-preferences` already makes
        one file over.
      */
      name: "announcement-dismissals",
      partialize: (state) => ({ dismissedIds: state.dismissedIds }),
    }
  )
);
