import { cache } from "react";

/**
 * Reading the SEO an administrator actually typed.
 * ============================================================================
 *
 * `/api/content/default-page/{slug}` returns a `meta` blob and, for the home
 * page, a `variables` document. Two shapes have been written into them over
 * time and only one of them was ever read:
 *
 *   FLAT    `meta.seoTitle` / `meta.seoDescription` / `meta.keywords`
 *           — what the admin editor's SEO tab writes, and what both backend
 *             seeds write when they create a page row.
 *   NESTED  `seo.title` / `seo.description` / `seo.keywords`
 *           — what `variables.seo` holds on the home document, and what the
 *             legal pages' metadata reader looked for.
 *
 * So `data.meta.seo` was `undefined` on every page and every SEO field an
 * owner filled in was discarded silently. Flat is checked first because that
 * is where admin input lands today; nested stays as a fallback so any record
 * already written that way keeps working.
 *
 * This lives beside the pages rather than inside either of them because the
 * home route and the four legal routes both read it.
 */

/** Either shape, as stored. `keywords` is written as an array by the editor. */
export interface StoredSeoSource {
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string | string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string | string[];
  };
}

/** The resolved fields, in the form Next's `Metadata` wants them. */
export interface StoredSeo {
  title?: string;
  description?: string;
  keywords?: string;
}

/** A blank field is not a value: an owner who clears a box means "unset". */
function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

function keywords(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return (
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .join(", ") || undefined
    );
  }
  return text(value);
}

export function readStoredSeo(
  source: StoredSeoSource | null | undefined
): StoredSeo {
  if (!source || typeof source !== "object") return {};
  const nested = source.seo ?? {};
  return {
    title: text(source.seoTitle) ?? text(nested.title),
    description: text(source.seoDescription) ?? text(nested.description),
    keywords: keywords(source.keywords) ?? keywords(nested.keywords),
  };
}

/**
 * Fetch a stored default page. Returns `null` on any failure.
 *
 * Metadata generation runs inside the render, so this must never throw — a
 * backend that is down has to cost the page its custom title, not its render.
 *
 * Server-side fetches talk to the backend directly over the internal HTTP port
 * (same host) instead of the public HTTPS domain. This avoids depending on the
 * public TLS cert chain — Node rejects an incomplete chain with
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE even when browsers accept it — and is
 * faster. Override with NEXT_PUBLIC_BACKEND_URL if the backend is on another
 * host.
 *
 * WHY `cache()`, and why it is now load-bearing rather than a nicety.
 * ============================================================================
 *
 * This used to have exactly one caller per render: a `generateMetadata` that
 * wanted the `seo` block. The home route now also renders the document's COPY
 * (`variables.features`, `variables.gettingStarted`, …) on the server, so
 * `page.tsx` asks for the same slug twice in one request — once from
 * `generateMetadata`, once from the page body.
 *
 * Next runs both in the SAME render pass, so React's `cache()` collapses them
 * into one call: it is request-scoped memoisation keyed on the arguments, which
 * here is just the slug. It is not a cache with a lifetime and it cannot go
 * stale — the next request re-fetches from scratch, which is the property
 * `lib/fetchers/chrome.ts` and `lib/fetchers/settings.ts` both went out of
 * their way to keep after `next: { revalidate }` made saved settings look like
 * they had not saved.
 *
 * Note that the `_t=` buster below would defeat Next's own fetch-level
 * memoisation even for two byte-identical requests, because the URLs differ.
 * `cache()` sits ABOVE that: the second caller never reaches `fetch`, so
 * `Date.now()` is evaluated once per render pass and the buster keeps doing
 * its original job (defeating any proxy in front of the backend) without
 * costing a second round trip.
 */
export const fetchDefaultPage = cache(
  async (slug: string): Promise<Record<string, any> | null> => {
    try {
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        `http://localhost:${backendPort}`;
      const url = `${baseUrl}/api/content/default-page/${slug}?pageSource=default&_t=${Date.now()}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error(`Error loading stored page "${slug}":`, error);
      return null;
    }
  }
);
