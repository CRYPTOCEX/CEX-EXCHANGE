import { redirect } from "@/i18n/server-routing";

/**
 * `/investment/dashboard` -> `/investment/portfolio`.
 *
 * The dashboard and the history table were two doors into one room: the same
 * rows, from the same request, behind two nav items — and the dashboard capped
 * its list at five while fetching a hundred, so the sixth was reachable only
 * through a conditional "view all". Both are sections of the portfolio now,
 * running positions first.
 *
 * The path stays resolvable because it has been linked from the main site menu,
 * from investment emails and from bookmarks for as long as the product has
 * existed. Live in-app links point at `/investment/portfolio` directly — a stub
 * is for links we do not control, and routing our own navigation through one
 * costs a round trip.
 *
 * `redirect` from `@/i18n/server-routing`, NOT `next/navigation`: the locale is
 * a path segment here, and the bare Next redirect would drop it.
 */
export default async function InvestmentDashboardRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect("/investment/portfolio", locale);
}
