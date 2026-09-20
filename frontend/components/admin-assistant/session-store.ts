"use client";

/**
 * Which conversation is open, shared by both surfaces that can hold one.
 *
 * ---------------------------------------------------------------------------
 * ONE KEY, BECAUSE THERE IS ONE ASSISTANT
 * ---------------------------------------------------------------------------
 * The rail and the Assistant screen are two views of the same thing. Giving them
 * separate keys would let an administrator ask three questions in the rail, open
 * the screen, and find an empty box — two conversations running in parallel with
 * no indication that either exists. Sharing it means asking anywhere and
 * continuing anywhere.
 *
 * ---------------------------------------------------------------------------
 * THE ID, NOT THE TRANSCRIPT
 * ---------------------------------------------------------------------------
 * Caching the messages would make a reload instant and would be wrong, for the
 * reason the customer companion rail records: the truth can change while the tab
 * is closed. A conversation can be deleted from another tab, and the retention
 * sweep empties old turns on a schedule the client knows nothing about.
 *
 * So one string is persisted and the content is fetched. A stale id 404s, which
 * clears it — the failure mode is a fresh conversation rather than a transcript
 * that disagrees with the server.
 *
 * ---------------------------------------------------------------------------
 * AND IT IS TAGGED WITH ITS OWNER, BECAUSE STORAGE IS PER BROWSER
 * ---------------------------------------------------------------------------
 * `localStorage` belongs to the machine, not to whoever is signed in. Two
 * administrators sharing a workstation — a desk handover, a support laptop —
 * are one origin and one key, so administrator B arrived to find A's pointer
 * sitting there and the rail resumed it.
 *
 * The server does refuse: `resolveSession` puts `adminId` in the WHERE, so a
 * foreign id 404s and clears. That is the backstop, not the guard — it costs a
 * round trip, and it only helps on a surface that actually asks. Recording the
 * owner here means the wrong pointer is never followed in the first place.
 *
 * ---------------------------------------------------------------------------
 * EVERY ACCESS IS GUARDED
 * ---------------------------------------------------------------------------
 * `localStorage` throws in a sandboxed iframe and in Safari's private mode, and
 * both callers are in the layout tree of every admin page. An unguarded read
 * here would take the whole admin console down on those browsers to remember a
 * chat id.
 */

const KEY = "ai-admin-session";

/**
 * One exchange, as either surface draws it.
 *
 * Here rather than in one of the two components because both render the same
 * thing from the same endpoint, and a second copy of this shape is how the two
 * start disagreeing about what an answer carries.
 */
export interface AdminTurn {
  question: string;
  answer: string;
  grounded: boolean;
  /** Set on a demo install, where no provider is reached. */
  demo?: boolean;
  trialUrl?: string;
  screen?: { url: string; label: string } | null;
  sources: Array<{ title: string; url: string }>;
}

/** A row in the history list. */
export interface AdminSessionRow {
  id: string;
  title: string;
  screen: string | null;
  turnCount: number;
  costUsd: number;
  lastMessageAt: string;
}

/**
 * Read one conversation back from the server.
 *
 * Shared, because both surfaces need exactly this and the mapping has a rule in
 * it: the screen button comes back and the approval cards do NOT. A proposal
 * rebuilt from a transcript is a control whose backing row may have expired,
 * been withdrawn, or already run — what is outstanding right now comes from
 * `console/pending`, which is the only thing that draws an approval control.
 */
export async function fetchSession(
  id: string,
  get: (url: string) => Promise<{ data: any; error: any }>
): Promise<{ id: string; turns: AdminTurn[] } | null> {
  const { data, error } = await get(
    `/api/admin/ai/support/console/session/${id}`
  );
  if (error || !data) return null;

  return {
    id: String(data.session.id),
    turns: (data.turns ?? []).map((turn: any) => ({
      question: turn.question,
      answer: turn.answer,
      grounded: Boolean(turn.grounded),
      sources: Array.isArray(turn.sources) ? turn.sources : [],
      screen: turn.proposals?.screen ?? null,
    })),
  };
}

/** The stored pointer: which conversation, and whose. */
interface StoredSession {
  id: string;
  /**
   * Null for a value written before the owner was recorded, and for the
   * Assistant screen, which does not hold an id to pass. Null means "unknown
   * owner", which is deliberately NOT treated as a mismatch — the server still
   * 404s a foreign session there, and refusing to resume every legacy pointer
   * would silently orphan conversations administrators paid for.
   */
  adminId: string | null;
}

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    /*
     * A bare id is the old format and is still in every browser that used the
     * rail before this. Parsed rather than discarded: the alternative is
     * throwing away a live conversation on the first load after an upgrade.
     */
    if (!raw.startsWith("{")) return { id: raw, adminId: null };
    const parsed = JSON.parse(raw);
    const id = typeof parsed?.id === "string" ? parsed.id : null;
    if (!id) return null;
    return {
      id,
      adminId: typeof parsed?.adminId === "string" ? parsed.adminId : null,
    };
  } catch {
    /* Storage refused, or somebody hand-edited the key into something that is
       not JSON. Either way there is no conversation to resume. */
    return null;
  }
}

/**
 * The conversation to resume, or null.
 *
 * `adminId` is who is asking. A pointer recorded against a DIFFERENT
 * administrator is not theirs to open — it is dropped here rather than sent to
 * the server, and cleared so the next sign-in of the original owner does not
 * find a pointer that has already been rejected.
 */
export function readSessionId(adminId?: string | null): string | null {
  const stored = readStored();
  if (!stored) return null;
  if (adminId && stored.adminId && stored.adminId !== adminId) {
    clearSessionId();
    return null;
  }
  return stored.id;
}

export function writeSessionId(id: string, adminId?: string | null): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ id, adminId: adminId ?? null } satisfies StoredSession)
    );
  } catch {
    /* A browser that refuses storage still gets a working conversation — it
       just does not survive a reload. That is a degradation, not a failure. */
  }
}

export function clearSessionId(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* See above. */
  }
}

/**
 * Whether this administrator keeps the assistant pinned open beside the page.
 *
 * ---------------------------------------------------------------------------
 * THE SAME KEY THE BOOT SCRIPT READS, AND THAT IS THE WHOLE CONTRACT
 * ---------------------------------------------------------------------------
 * A blocking script in `<head>` reads this before the first paint and sets
 * `data-assistant-pinned` on `<html>`, which is what makes a reload arrive
 * already-narrow instead of snapping. If this key and that string ever drift,
 * nothing errors — the page simply flashes wide and then reflows on every
 * admin navigation, which is the exact defect pinning exists to remove.
 *
 * `"1"` rather than `"true"` because the boot script is hand-written JavaScript
 * inside a string literal and the shortest possible comparison is the one least
 * likely to be mistyped there.
 */
const PIN_KEY = "ai-admin-pinned";

export function readPinned(): boolean {
  try {
    return window.localStorage.getItem(PIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writePinned(pinned: boolean): void {
  try {
    if (pinned) window.localStorage.setItem(PIN_KEY, "1");
    else window.localStorage.removeItem(PIN_KEY);
  } catch {
    /* A browser that refuses storage still pins for this session; it just does
       not survive a reload. A degradation, not a failure. */
  }
}

/**
 * Reserve (or release) the page gutter.
 *
 * The attribute is the ONLY thing the CSS keys on, and it lives on `<html>`
 * rather than on anything React owns — because the boot script has to be able
 * to set it before React exists, and both writers must therefore agree on one
 * element and one attribute.
 */
export function applyPinnedAttribute(pinned: boolean): void {
  try {
    const root = document.documentElement;
    if (pinned) root.setAttribute("data-assistant-pinned", "true");
    else root.removeAttribute("data-assistant-pinned");
  } catch {
    /* Server-side or a detached document. Nothing to lay out either way. */
  }
}
