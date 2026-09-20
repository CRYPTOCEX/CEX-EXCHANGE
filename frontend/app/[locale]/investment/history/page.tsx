import { redirect } from "@/i18n/server-routing";

/**
 * `/investment/history` -> `/investment/portfolio`.
 *
 * This was a `DataTable` of settled investments — a sortable, filterable,
 * paginated grid for what is, on almost every account, under twenty rows, and
 * one that rendered `amount` and `profit` as bare undenominated numbers because
 * both columns were declared `type: "number"`. The view dialog that carried the
 * currency was disabled by `canView={false}`, which makes rows non-expandable,
 * so on desktop there was no way to open a row and find out what its figures
 * were denominated in.
 *
 * Settled positions are a section of the portfolio now, and every figure there
 * carries its unit.
 */
export default async function InvestmentHistoryRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect("/investment/portfolio", locale);
}
