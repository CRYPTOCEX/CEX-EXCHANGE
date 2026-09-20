"use client";

/**
 * Putting an added page into the site's navigation, and taking it back out.
 * ============================================================================
 *
 * WHY THIS EXISTS RATHER THAN A SECOND MENU EDITOR
 *
 * The platform already has a complete, database-backed menu system: shipped
 * trees in `config/menu.ts`, patched by a `MenuOverride` stored on the
 * `site_chrome` singleton, edited at `/admin/menus` and `/admin/footer`, and
 * applied server-side so the link is in the first HTML byte. It already
 * supports items an admin ADDED — that is what `CustomMenuItem` is.
 *
 * So nothing here invents a linking mechanism. It writes the same `custom:`
 * item the Menus studio writes, into the same two documents, through the same
 * endpoint — which is what makes the result editable at `/admin/menus`
 * afterwards instead of being a second, invisible source of links.
 *
 * WHAT IS ACTUALLY DIFFICULT HERE is not the shape, it is the WRITE. The PUT
 * replaces each document it is given WHOLESALE — there is no server-side deep
 * merge, deliberately, because deletions have to be expressible. A caller that
 * reads the overrides when a dialog opens and writes them when the dialog is
 * submitted will silently discard everything anybody else saved in between. So
 * every function here reads immediately before it writes, sends the row's
 * `updatedAt` back as a precondition, and treats the 409 as a normal outcome
 * to retry rather than an error to report.
 */

import { $fetch } from "@/lib/api";
import {
  addCustom,
  normalizeMenuOverride,
  normalizeMenuOverrides,
  newCustomKey,
  removeCustom,
  type MenuOverride,
  type MenuOverrides,
} from "@/lib/chrome/menu-overrides";
import { normalizeFooterContent, type FooterContent } from "@/lib/chrome/content";

const CHROME_URL = "/api/admin/content/chrome";

/**
 * The scope the PUBLIC header menu is patched by.
 *
 * Must be byte-identical to what `menuScopeFor({ coreMenu: "user" })` returns
 * and what `getMenu` looks up when it renders. The failure mode of getting it
 * wrong is the worst one this subsystem has: the PUT succeeds, the screen says
 * saved, and the site does not change — `isPublicMenuScope` withholds a scope
 * it does not recognise, so there is no error anywhere to follow.
 */
const PUBLIC_MENU_SCOPE = "user";

/**
 * The footer column an added page is filed under.
 *
 * "Company" is the only shipped section built UNCONDITIONALLY — Trading and
 * Products are assembled from feature settings and can be absent entirely, so
 * an item parented to one of those would vanish on an install that does not
 * run that feature. Keys come from `SECTION_KEYS` in `use-footer-data.ts`.
 */
export const FOOTER_COMPANY_SECTION = "footer:company";

/**
 * Where in its group a newly added item lands.
 *
 * `insertCustom` clamps with `Math.min(out.length, index)`, and `asCustomItems`
 * keeps any finite number — so this means "last" without this module having to
 * know anything about the shipped tree it is being appended to. The Menus
 * studio computes a real sibling count because it is showing the owner a list
 * with positions; here there is nothing to show.
 */
const APPEND = Number.MAX_SAFE_INTEGER;

export type LinkFailureReason = "permission" | "conflict" | "error";

export interface LinkResult {
  ok: boolean;
  reason?: LinkFailureReason;
  message?: string;
}

interface ChromeRow {
  menuOverrides?: unknown;
  footerContent?: unknown;
  updatedAt?: string | null;
}

/** A 409 from the chrome PUT, recognised from its wording. */
function isConflict(error: string): boolean {
  return /changed by someone else|conflict|precondition/i.test(error);
}

/** A 403. `$fetch` drops the status, so the message is what is left. */
function isPermission(error: string): boolean {
  return /permission|not allowed|forbidden|access\.design/i.test(error);
}

function classify(error: string): LinkFailureReason {
  if (isPermission(error)) return "permission";
  if (isConflict(error)) return "conflict";
  return "error";
}

async function readChrome(): Promise<{ row: ChromeRow | null; error: string | null }> {
  const { data, error } = await $fetch<ChromeRow>({
    url: CHROME_URL,
    method: "GET",
    silent: true,
  });
  if (error) return { row: null, error };
  return { row: (data ?? {}) as ChromeRow, error: null };
}

/**
 * One read-modify-write attempt, retried ONCE on a conflict.
 *
 * The retry is safe and is the right recovery rather than a hopeful one: a
 * refused write changed nothing, so re-reading and re-applying the same edit
 * produces exactly the intended result on top of whatever the other writer
 * saved. It is bounded at one because a second conflict means sustained
 * contention, and looping on that would just take longer to give the same
 * answer.
 */
async function commit(
  build: (row: ChromeRow) => Record<string, unknown> | null
): Promise<LinkResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { row, error: readError } = await readChrome();
    if (readError) return { ok: false, reason: classify(readError), message: readError };
    if (!row) return { ok: false, reason: "error", message: "No site chrome record." };

    const body = build(row);
    /* Nothing to do — not a failure. Unlinking a page that was never linked
       takes this path, and it is the common case. */
    if (!body) return { ok: true };

    const { error } = await $fetch({
      url: CHROME_URL,
      method: "PUT",
      body: { ...body, updatedAt: row.updatedAt ?? null },
      silent: true,
    });

    if (!error) return { ok: true };
    if (!isConflict(error) || attempt === 1) {
      return { ok: false, reason: classify(error), message: error };
    }
  }
  return { ok: false, reason: "conflict" };
}

export interface LinkPageOptions {
  title: string;
  slug: string;
  description?: string;
  /** Add to the public site header. */
  header: boolean;
  /** Add to the footer's Company column. */
  footer: boolean;
}

/**
 * Add "/{slug}" to the header menu and/or the footer.
 *
 * The caller MUST have created the page already. A menu item pointing at a
 * page that does not exist is worse than a page with no menu item: the first
 * is a broken link on the live site, the second is one more click in an admin
 * screen.
 */
export async function linkPageIntoChrome(options: LinkPageOptions): Promise<LinkResult> {
  const { title, slug, description, header, footer } = options;
  if (!header && !footer) return { ok: true };

  const href = `/${String(slug).replace(/^\/+/, "")}`;

  return commit((row) => {
    const body: Record<string, unknown> = {};

    if (header) {
      const all: MenuOverrides = normalizeMenuOverrides(row.menuOverrides);
      const scope: MenuOverride = normalizeMenuOverride(all[PUBLIC_MENU_SCOPE]);
      body.menuOverrides = {
        ...all,
        [PUBLIC_MENU_SCOPE]: addCustom(scope, {
          key: newCustomKey(),
          /* "" is the TOP level. A top-level item that carries an href is a
             LINK in every header and footer layout — see the note in
             `use-footer-data.ts` about why a childless group would instead be
             an empty heading, visible in one layout and not the others. */
          parent: "",
          title,
          href,
          description: description || undefined,
          index: APPEND,
        }),
      };
    }

    if (footer) {
      const content: FooterContent = normalizeFooterContent(row.footerContent);
      body.footerContent = {
        ...content,
        links: addCustom(content.links, {
          key: newCustomKey(),
          parent: FOOTER_COMPANY_SECTION,
          title,
          href,
          index: APPEND,
        }),
      };
    }

    return body;
  });
}

/**
 * Remove every navigation item pointing at "/{slug}".
 *
 * Called after a page is deleted. BEST EFFORT by design — the page is gone
 * either way, so a failure here is worth a toast and never worth blocking or
 * reversing the delete. Matching on `href` rather than on a stored id is what
 * the data allows: the override engine stores links, not page references.
 *
 * `removeCustom` cascades to descendants and drops the item's orphaned
 * `labels`/`icons`/`order` entries, which is exactly why it is used here
 * instead of filtering the `custom` array directly.
 */
export async function unlinkPageFromChrome(slug: string): Promise<LinkResult> {
  const href = `/${String(slug).replace(/^\/+/, "")}`;

  return commit((row) => {
    const body: Record<string, unknown> = {};

    const all: MenuOverrides = normalizeMenuOverrides(row.menuOverrides);
    const scope: MenuOverride = normalizeMenuOverride(all[PUBLIC_MENU_SCOPE]);
    const menuHits = scope.custom.filter((item) => item.href === href);
    if (menuHits.length > 0) {
      body.menuOverrides = {
        ...all,
        [PUBLIC_MENU_SCOPE]: menuHits.reduce(
          (acc, item) => removeCustom(acc, item.key),
          scope
        ),
      };
    }

    const content: FooterContent = normalizeFooterContent(row.footerContent);
    const footerHits = content.links.custom.filter((item) => item.href === href);
    if (footerHits.length > 0) {
      body.footerContent = {
        ...content,
        links: footerHits.reduce((acc, item) => removeCustom(acc, item.key), content.links),
      };
    }

    /* `null` means "no write needed" — the page was never linked. */
    return Object.keys(body).length > 0 ? body : null;
  });
}
