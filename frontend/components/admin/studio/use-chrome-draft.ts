"use client";

/**
 * Load / edit / save the site chrome, shared by the three studio screens.
 * ============================================================================
 *
 * Site Design owns the two layout variants, Menus owns `menuOverrides`, Footer
 * owns `footerContent` — three screens, one row, one endpoint. Each of them
 * needs the same five things (a draft, a dirty flag, discard, save, and the
 * concurrency token), and three copies of that is three chances to get the
 * token handling subtly different. It is already subtle enough once.
 *
 * PARTIAL SAVES ARE THE POINT. `save()` takes the fields the screen actually
 * owns and sends only those. The endpoint keeps any field left undefined, so
 * the Menus screen cannot clobber a footer edit somebody made in another tab
 * while it was open — which is exactly the lost-update the `updatedAt`
 * precondition otherwise has to catch. Narrowing the write is better than
 * detecting the collision.
 */

import * as React from "react";

import { $fetch } from "@/lib/api";
import {
  buildChromeMetricsCss,
  CHROME_METRICS_STYLE_HREF,
  DEFAULT_CHROME,
  isKnownFooterVariant,
  isKnownNavbarVariant,
  normalizeChrome,
  type ChromeConfig,
} from "@/lib/chrome/variants";
import { writeManagedStyle } from "@/lib/live-style";

const CHROME_URL = "/api/admin/content/chrome";

/**
 * `updatedAt` is not chrome — it is the OPTIMISTIC CONCURRENCY TOKEN. The PUT
 * refuses a save whose token no longer matches the stored row, which is what
 * stops the second of two admins editing at once from silently overwriting the
 * first. The guard is dormant unless the client sends it back.
 */
type ChromeResponse = Partial<ChromeConfig> & { updatedAt?: string | null };

export type ChromeField = keyof ChromeConfig;

export interface ChromeDraft {
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** Which operation failed, so the UI can say something true about it. */
  errorKind: "load" | "save" | null;
  dirty: boolean;
  draft: ChromeConfig;
  saved: ChromeConfig | null;
  /** Ids the server holds that this build has no component for. */
  stale: { navbar: string | null; footer: string | null };
  update: (patch: Partial<ChromeConfig>) => void;
  discard: () => void;
  reload: () => Promise<void>;
  save: (fields: readonly ChromeField[]) => Promise<void>;
}

export function useChromeDraft(): ChromeDraft {
  const [saved, setSaved] = React.useState<ChromeConfig | null>(null);
  const [draft, setDraft] = React.useState<ChromeConfig>(DEFAULT_CHROME);
  const [precondition, setPrecondition] = React.useState<string | null>(null);
  const [staleNavbar, setStaleNavbar] = React.useState<string | null>(null);
  const [staleFooter, setStaleFooter] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errorKind, setErrorKind] = React.useState<"load" | "save" | null>(null);

  /**
   * The one place a read becomes state.
   *
   * Split out so the mount effect does its setState AFTER the await — calling a
   * loader that flips `loading` synchronously from an effect body is a
   * cascading render, and `react-hooks/set-state-in-effect` rejects it.
   */
  const applyResult = React.useCallback((data: ChromeResponse | null, err: string | null) => {
    if (err) {
      setError(err);
      setErrorKind("load");
      setLoading(false);
      return;
    }

    const raw: ChromeResponse = data ?? {};
    setPrecondition(typeof raw.updatedAt === "string" ? raw.updatedAt : null);
    /* Absent is not stale: a fresh install has no row yet and correctly falls
       back to the defaults. Only a PRESENT unknown id is worth a warning. */
    setStaleNavbar(
      raw.navbarVariant && !isKnownNavbarVariant(raw.navbarVariant) ? raw.navbarVariant : null
    );
    setStaleFooter(
      raw.footerVariant && !isKnownFooterVariant(raw.footerVariant) ? raw.footerVariant : null
    );

    const config = normalizeChrome(raw);
    setSaved(config);
    setDraft(config);
    setTouched(false);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      /* `$fetch` NEVER throws — it always resolves to `{ data, error }` — so a
         try/catch here would be dead code, and a backend outage arrives as
         `error` set rather than as an exception. */
      const { data, error: err } = await $fetch<ChromeResponse>({ url: CHROME_URL, silent: true });
      if (alive) applyResult(data, err);
    })();
    return () => {
      alive = false;
    };
  }, [applyResult]);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorKind(null);
    const { data, error: err } = await $fetch<ChromeResponse>({ url: CHROME_URL, silent: true });
    applyResult(data, err);
  }, [applyResult]);

  const update = React.useCallback((patch: Partial<ChromeConfig>) => {
    setTouched(true);
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const discard = React.useCallback(() => {
    setDraft(saved ?? DEFAULT_CHROME);
    setTouched(false);
  }, [saved]);

  /**
   * Compared as a WHOLE, not field by field. A field-by-field expression is a
   * list somebody has to remember to extend, and the failure mode is Save
   * staying greyed out on exactly the change the editor just accepted.
   */
  const dirty = saved ? JSON.stringify(saved) !== JSON.stringify(draft) : touched;

  const save = React.useCallback(
    async (fields: readonly ChromeField[]) => {
      setSaving(true);
      setError(null);
      setErrorKind(null);

      /* A plain object literal, NOT an annotated `ChromeConfig`: `$fetch` takes
         `Record<string, any>` and an interface has no implicit index signature,
         so the annotated version does not type-check against it. */
      const body: Record<string, unknown> = {};
      for (const field of fields) body[field] = draft[field];
      if (precondition) body.updatedAt = precondition;

      const { data, error: err } = await $fetch<ChromeResponse>({
        url: CHROME_URL,
        method: "PUT",
        body,
        successMessage: "Saved — the site is serving it now.",
      });

      if (err) {
        setError(err);
        setErrorKind("save");
        setSaving(false);
        return;
      }

      const echo: ChromeResponse = data ?? {};
      /* Adopt the NEW token so a second save in the same session is not refused
         against the timestamp the first one replaced. */
      setPrecondition(typeof echo.updatedAt === "string" ? echo.updatedAt : null);

      /* A navbar is a component tree, so the tree has to re-render for the new
         one to appear — `router.refresh()` at the call site does that. Its
         HEIGHT is not in the tree: it is a custom property in an href-keyed
         hoistable <style>, which React reuses rather than re-renders. Refreshing
         alone would therefore give the new navbar the OLD clearance, and a
         taller bar would cover the first line of every page until a full reload.
         Only written when this screen actually owns the field. */
      if (fields.includes("navbarVariant")) {
        writeManagedStyle(
          CHROME_METRICS_STYLE_HREF,
          buildChromeMetricsCss(draft.navbarVariant)
        );
      }

      /* The variant ids are re-validated against this build's registry because a
         stale one must not be adopted. The two documents cannot be — they are
         free-form admin content the server has just accepted — so the DRAFT is
         the truth for them. Reading those back off the echo would reset the
         editor whenever the endpoint answers `{ message }` instead of the row. */
      setSaved({
        ...draft,
        navbarVariant: isKnownNavbarVariant(echo.navbarVariant)
          ? (echo.navbarVariant as string)
          : draft.navbarVariant,
        footerVariant: isKnownFooterVariant(echo.footerVariant)
          ? (echo.footerVariant as string)
          : draft.footerVariant,
      });
      setStaleNavbar(null);
      setStaleFooter(null);
      setTouched(false);
      setSaving(false);
    },
    [draft, precondition]
  );

  return {
    loading,
    saving,
    error,
    errorKind,
    dirty,
    draft,
    saved,
    stale: { navbar: staleNavbar, footer: staleFooter },
    update,
    discard,
    reload,
    save,
  };
}
