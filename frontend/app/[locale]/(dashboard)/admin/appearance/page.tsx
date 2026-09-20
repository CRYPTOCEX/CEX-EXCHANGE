import { redirect } from "@/i18n/server-routing";

/**
 * /admin/appearance has moved into /admin/design.
 *
 * It owned the navbar and footer LAYOUT while /admin/design owned colour, type
 * and radius — a split that followed the implementation (one is expressible as
 * custom properties, the other is a component tree) and was invisible to the
 * person using it. Both now live on one screen with one preview.
 *
 * A REDIRECT rather than a deletion: this path has been in the admin menu and
 * is bookmarkable, and a 404 on a page somebody used yesterday is a worse
 * answer than sending them where the feature went. It is also still in the
 * generated reserved-route manifest, so nothing can claim the slug meanwhile.
 *
 * Menu content and footer content did not come along — they are lists that do
 * not need a live preview, and they have their own screens now.
 */
export default async function AdminAppearanceRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  /* Locale-prefixed. A bare `/admin/design` would bounce through the locale
     rewrite and drop a non-default locale on the way. */
  const { locale } = await params;
  redirect("/admin/design", locale);
}
