"use client";

/**
 * The page editor's draft: what is loaded, what has changed, and what is safe
 * to write back.
 * ============================================================================
 *
 * THE BUG THIS EXISTS TO CLOSE
 *
 * The previous editor tracked `hasChanges` as a one-way boolean latch — set by
 * any keystroke, cleared only by a successful save. Type a character and delete
 * it and the page stayed "unsaved" for the rest of the session, which trains an
 * owner to ignore the badge. Worse, there was no baseline at all, so "what
 * changed" could not be answered and Discard did not exist.
 *
 * Worse still: when the load failed, the old editor fell back to
 * `/api/public/default-page/{id}` — **a route that does not exist** (the real
 * one is `/api/content/…`) — so it always 404'd, and from there to a hardcoded
 * stub with `variables: {}`. The editor then looked like a perfectly normal
 * page holding an empty document, and one Save PUT that stub over the real
 * record. The backend already returns `isFallback: true` precisely to prevent
 * this and the client never read it.
 *
 * So this hook holds a baseline, compares against it, and REFUSES TO SAVE
 * anything it did not successfully load. A failed load produces an error state,
 * never an editable empty document.
 *
 * OPTIMISTIC CONCURRENCY
 * `lastModified` travels back to the server as a precondition and the echoed
 * value is adopted, so a second save from the same tab does not immediately
 * conflict with the first. Two admins on one page now get a refusal instead of
 * a silent whole-document overwrite.
 */

import * as React from "react";
import { adapterFor, type PageRecord } from "@/components/admin/studio/page-sources";

/**
 * `PageRecord` moved to `page-sources.ts` — it is the shape both adapters
 * produce, so it belongs with them — and is re-exported here because this is
 * where every existing consumer imports it from. Moving the type without the
 * re-export would be a rename disguised as a refactor.
 */
export type { PageRecord } from "@/components/admin/studio/page-sources";

export type PageErrorKind = "load" | "save" | "conflict" | null;

/** Stable stringify, so key order cannot masquerade as a change. */
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`)
    .join(",")}}`;
}

/** Only the fields this editor owns. `id` and timestamps are not edits. */
function editable(r: PageRecord | null) {
  if (!r) return "";
  return stable({
    title: r.title,
    status: r.status,
    variables: r.variables ?? null,
    content: r.content ?? null,
    meta: r.meta ?? null,
    /* `slug` IS EDITABLE, so it has to be here.
       This projection is what `dirty` is computed from, and `dirty` is what
       enables Save and arms the unsaved-changes guard. An added page's URL is
       editable in Page settings; leaving it out of this list meant an owner
       could retype the URL, watch the field accept it, and find Save still
       disabled with nothing saying why — and then lose the edit on the way out
       without even a prompt, because the guard reads the same value.
       `?? null` so an added page (slug: string) and a built-in one
       (slug: undefined) both stringify stably and neither reads as dirty on
       load. */
    slug: r.slug ?? null,
    /* Editable too, for the same reason `slug` is here — see above. A CSS box
       whose edits do not make the page dirty is a box that cannot be saved. */
    customCss: r.customCss ?? null,
  });
}

export function usePageDraft(pageId: string, pageSource = "default") {
  const [saved, setSaved] = React.useState<PageRecord | null>(null);
  const [draft, setDraft] = React.useState<PageRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorKind, setErrorKind] = React.useState<PageErrorKind>(null);
  /** Set when the server says it served a stand-in. Blocks every write. */
  const [readOnly, setReadOnly] = React.useState<string | null>(null);

  /**
   * Which store this page lives in, decided once.
   *
   * Memoised on the two inputs so the load effect below keeps a stable
   * dependency — a new adapter object every render would re-run the fetch on
   * every render.
   */
  const adapter = React.useMemo(
    () => adapterFor(pageId, pageSource),
    [pageId, pageSource]
  );

  const fetchPage = React.useCallback(
    () =>
      /* `$fetch` NEVER throws — it always resolves to `{data, error}` — so a
         try/catch here would be dead code, and a backend outage arrives as
         `error` set rather than as an exception. Both adapters preserve that
         contract. */
      adapter.load(),
    [adapter]
  );

  const applyResult = React.useCallback((data: PageRecord | null, err: string | null) => {
    if (err || !data) {
      /* No stub, no empty document, nothing editable. An editor that cannot
         read the page must not offer to write it. */
      setSaved(null);
      setDraft(null);
      setError(err || "The server returned no page.");
      setErrorKind("load");
      setReadOnly(null);
      setLoading(false);
      return;
    }

    setSaved(data);
    setDraft(data);
    setError(null);
    setErrorKind(null);
    setReadOnly(
      data.isFallback
        ? data.fallbackReason ||
            "The server could not read the stored page and sent a stand-in. Saving would replace the real page with this placeholder."
        : null
    );
    setLoading(false);
  }, []);

  /* The fetch lives inside an async IIFE rather than being called straight from
     the effect body: a synchronous `setState` in an effect triggers a cascading
     render, which the lint rule rejects and which is genuinely wasteful. The
     `alive` flag drops a response that arrives after the page id changed —
     otherwise switching pages fast can land the old document in the new
     editor. */
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error: err } = await fetchPage();
      if (alive) applyResult(data ?? null, err ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [applyResult, fetchPage]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await fetchPage();
    applyResult(data ?? null, err ?? null);
  }, [applyResult, fetchPage]);

  const dirty = React.useMemo(() => editable(draft) !== editable(saved), [draft, saved]);

  /**
   * The browser's own "leave site?" prompt.
   *
   * The old editor had none — the back button, a sidebar link or a closed tab
   * discarded everything in silence while a badge in the corner said "unsaved
   * changes". A badge that cannot stop the loss is decoration.
   *
   * This catches reloads and tab closes. In-app navigation is caught by the
   * editor's own back link, which reads `dirty` before it moves.
   */
  React.useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      /* Legacy engines require the assignment; modern ones show their own
         wording and ignore whatever string is set here. */
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /** Patch top-level record fields — title, status, content, meta. */
  const update = React.useCallback((patch: Partial<PageRecord>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  /**
   * Write one value at a dotted path inside `variables`.
   *
   * `useCallback` with an empty dep list and a functional update, deliberately.
   * The old editor declared this as a plain function in the component body, so
   * it had a new identity on every render, which invalidated every
   * `useCallback` inside every section editor and made the `React.memo` on six
   * of the nine of them dead weight — the whole active section re-rendered on
   * each keystroke.
   */
  const setPath = React.useCallback((path: string, value: unknown) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const keys = path.split(".");
      const nextVars: Record<string, unknown> = { ...(prev.variables ?? {}) };
      let cursor: Record<string, unknown> | unknown[] = nextVars;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const current = (cursor as Record<string, unknown>)[key];
        /* Clone on the way down so no part of the previous state is mutated —
           React bails out of a re-render when the reference is unchanged, and
           an in-place edit is the classic "typing does nothing" bug. An array
           has to stay an array or the next index write turns it into an
           object with numeric keys. */
        const clone = Array.isArray(current)
          ? [...current]
          : current && typeof current === "object"
            ? { ...(current as Record<string, unknown>) }
            : /* A missing branch becomes an object unless the NEXT key is an
                 index, in which case it has to be an array. */
              /^\d+$/.test(keys[i + 1])
              ? []
              : {};
        (cursor as Record<string, unknown>)[key] = clone;
        cursor = clone as Record<string, unknown>;
      }

      (cursor as Record<string, unknown>)[keys[keys.length - 1]] = value;
      return { ...prev, variables: nextVars };
    });
  }, []);

  const discard = React.useCallback(() => setDraft(saved), [saved]);

  const save = React.useCallback(async () => {
    if (!draft || readOnly) return false;
    setSaving(true);

    /* WHAT gets sent, and to WHICH endpoint, is the adapter's business — the
       two stores take different payloads and disagree about whether an
       optimistic-concurrency precondition exists at all. What stays here is
       the part that must be true of both: never save without a baseline, and
       adopt the echoed token afterwards. */
    const { lastModified, stored, error: err } = await adapter.save(draft, saved);

    setSaving(false);

    if (err) {
      setError(err);
      /* `$fetch` collapses the response into `{data, error}` and drops the
         status, so the 409 has to be recognised from its wording. The phrase
         below is the one `admin/default-editor/[pageId]/index.put.ts` sends:
         "This page was changed by someone else since you loaded it."
         Getting this match wrong only costs a less specific message, never
         correctness — the write was refused either way. */
      setErrorKind(/changed by someone else|conflict/i.test(err) ? "conflict" : "save");
      return false;
    }

    /* Adopt the echoed token, or a second save from this same tab conflicts
       with the first one. */
    const nextModified = lastModified ?? new Date().toISOString();

    /**
     * ADOPT WHAT THE SERVER STORED, not what we sent.
     *
     * Some write paths REWRITE the document — the CMS route sanitizes `content`
     * with a policy that is not the render-side one, so a pasted `<button>` or
     * a `data:` image comes back changed. Taking the draft as the new baseline
     * would leave the editor showing markup the database does not hold, with
     * `dirty` false and the unsaved-changes guard disarmed: the owner's version
     * would survive only in that tab and disappear on the next reload, with no
     * error anywhere.
     *
     * `stored` is absent for the default-editor path, which writes what it is
     * given — there the draft IS what was stored and this is the old behaviour
     * unchanged.
     */
    const committed: PageRecord = stored
      ? { ...draft, ...stored, lastModified: stored.lastModified || nextModified }
      : { ...draft, lastModified: nextModified };
    setSaved(committed);
    setDraft(committed);
    setError(null);
    setErrorKind(null);
    return true;
  }, [adapter, draft, readOnly, saved]);

  /**
   * Delete the page. Added pages only — the five built-ins are compiled
   * routes and the default adapter has no `remove`, so this is `null` there
   * and the editor has nothing to draw.
   */
  const remove = React.useMemo(
    () =>
      adapter.remove
        ? async () => {
            const { error: err } = await adapter.remove!();
            if (err) {
              setError(err);
              setErrorKind("save");
              return false;
            }
            /* Clear the baseline so the unsaved-changes guard cannot prompt
               about a page that no longer exists on the way out. */
            setSaved(null);
            setDraft(null);
            return true;
          }
        : null,
    [adapter]
  );

  return {
    draft,
    saved,
    loading,
    saving,
    dirty,
    error,
    errorKind,
    readOnly,
    update,
    setPath,
    discard,
    save,
    reload,
    /** `null` for the five built-ins. See `remove` above. */
    remove,
    /** `"default" | "custom"` — which store this page came from. */
    sourceKind: adapter.kind,
  };
}
