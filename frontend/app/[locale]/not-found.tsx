"use client";

import { useTranslations } from "next-intl";
import { ErrorShell } from "@/components/error/error-shell";

/**
 * The 404 for anything that calls `notFound()` from inside a locale route.
 *
 * This rendered `next/error` — the PAGES-ROUTER fallback, which paints its own
 * unstyled white document with a hairline rule and a system font, ignoring the
 * palette, the locale and the layout entirely. It was the one 404 in the
 * product that did not look like the product.
 *
 * `standalone`: `app/[locale]/layout.tsx` mounts `ConditionalLayoutProvider`
 * with `isGuest`, so there is no header or footer around this — the shell owns
 * the viewport. The translation provider IS in scope here, because this renders
 * as a child of that layout.
 */
export default function NotFound() {
  const t = useTranslations("common");

  return (
    <ErrorShell
      code="404"
      // The seven static `error-page/*` routes send you to `/dashboard`, which
      // is right for them — you only reach those while signed in. This one
      // catches public URLs, so it goes to the public homepage.
      homeHref="/"
      title={t("ops_page_not_found")}
      description={[
        t("the_page_you_removed_had"),
        t("its_name_changed_or_is_temporarily_unavailable"),
      ]}
    />
  );
}
