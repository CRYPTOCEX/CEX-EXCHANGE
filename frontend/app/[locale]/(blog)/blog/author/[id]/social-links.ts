import { normalizeFooterHref } from "@/components/partials/footer/use-footer-data";

/**
 * The author header's social buttons, from `user.profile.social`.
 *
 * TWO THINGS WERE WRONG with putting those values straight into `href`.
 *
 * They are HANDLES, not URLs. The profile editor labels these fields "Twitter
 * profile", "GitHub profile" and so on, and what people type is `mashdiv` — the
 * value this install actually has stored. A bare word in `href` is a RELATIVE
 * path, so the "Twitter" button on a public author page navigated to
 * `/en/mashdiv` and 404'd. The button rendered; it just never went anywhere.
 *
 * And they are user-controlled. `profile` is written by the account holder over
 * `/api/user/profile`, which does not validate these strings, so a stored
 * `javascript:` sat one click away on a page that is now served to anonymous
 * readers. The footer solved this exact problem already — `normalizeFooterHref`
 * is the ingestion rule there, and it is reused rather than re-derived so the
 * two cannot drift apart.
 *
 * The handle→URL step is what the footer does NOT have, because a footer stores
 * whole URLs and a profile stores handles.
 */
const SOCIAL_HOSTS: Record<string, string> = {
  twitter: "https://twitter.com/",
  x: "https://x.com/",
  github: "https://github.com/",
  gitlab: "https://gitlab.com/",
  dribbble: "https://dribbble.com/",
  instagram: "https://instagram.com/",
  telegram: "https://t.me/",
  linkedin: "https://www.linkedin.com/in/",
  website: "",
};

/**
 * What a username looks like across these platforms — letters, digits, and
 * inner `.` `_` `-`, with an optional leading `@` people type out of habit.
 *
 * Deliberately has no `:` and no `/`, which is what makes it safe to CONCATENATE
 * onto a host: nothing matching this can introduce a scheme, an authority, or a
 * path segment that escapes the platform it was filed under.
 */
const HANDLE = /^@?[A-Za-z0-9][A-Za-z0-9._-]{0,38}$/;

export type AuthorSocialLink = {
  platform: string;
  label: string;
  href: string;
};

/** Resolve one stored value to an absolute http(s) URL, or null to withhold it. */
export function socialHref(platform: string, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  const base = SOCIAL_HOSTS[platform.toLowerCase()];

  /* A `:` or a `/` means the author wrote a URL, not a handle — hand it to the
     footer's rule, which completes a bare `twitter.com/acme` and drops anything
     with an executable scheme. Checked BEFORE the handle branch so a real URL is
     never mistaken for a username. */
  const looksLikeUrl = /[:/]/.test(value);

  const href = !looksLikeUrl && base !== undefined && base !== ""
    ? /* A handle under a platform we know the host for. `base` is a constant
         from the table above and the handle cannot contain `:` or `/`, so the
         result is always an ordinary link to that platform. */
      HANDLE.test(value)
      ? `${base}${value.replace(/^@/, "")}`
      : null
    : normalizeFooterHref(value);

  /* Last gate, independent of how we got here: a social button navigates, so
     `https:`/`http:` and nothing else. `mailto:` and `tel:` are legitimate
     footer links but are not a social profile, and every other scheme is the
     thing this function exists to stop. */
  return href && /^https?:\/\//i.test(href) ? href : null;
}

/** The buttons to draw, in the order the profile stored them. */
export function authorSocialLinks(social: unknown): AuthorSocialLink[] {
  if (!social || typeof social !== "object") return [];

  return Object.entries(social as Record<string, unknown>)
    .map(([platform, raw]) => {
      const href = socialHref(platform, raw);
      return href
        ? {
            platform,
            label: platform.charAt(0).toUpperCase() + platform.slice(1),
            href,
          }
        : null;
    })
    .filter((link): link is AuthorSocialLink => link !== null);
}
