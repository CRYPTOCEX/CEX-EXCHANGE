/**
 * /admin/design/specimen — the live target of the design studio's preview.
 *
 * A SERVER component, unlike the studio page beside it, purely so `?only=` can
 * be read from `searchParams` and handed down as a prop. Reading it client-side
 * with `useSearchParams` would put the whole page under a Suspense requirement
 * for something that is known before render and never changes without a
 * remount — the studio swaps the iframe's `src`, so each value of `only` is a
 * fresh document anyway.
 *
 * Chromeless — registered in the admin layout's CHROMELESS list, which is
 * anchored at both ends, so being under /admin/design did NOT grant it that.
 *
 * Deliberately NOT in the admin menu. It is a swatch viewed inside an iframe,
 * not a destination, and a menu entry would invite operators into a page that
 * looks like a broken account list.
 */

import { DesignSpecimen } from "@/components/admin/design/specimen";

export default async function AdminDesignSpecimenPage({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const { only } = await searchParams;
  return <DesignSpecimen only={only} />;
}
