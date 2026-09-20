"use client";

/**
 * Extension Columns Stub
 * ============================================================================
 *
 * Stands in for any `app/[locale]/(ext)/<addon>/.../columns` module on an
 * install that does not ship that addon.
 *
 * The CRM user page (`admin/crm/user/[id]/page.tsx`) imports every addon's
 * table columns statically — it needs the definitions at render time, so the
 * import cannot be deferred — and a missing addon would otherwise be a hard
 * "module not found" that kills the production build. `next.config.js`
 * discovers those imports, checks each against disk, and aliases the absent
 * ones here. No list to keep in step: whichever addons are missing get stubbed.
 *
 * Empty columns are the intended answer — the CRM page hides a tab whose table
 * has no columns, so an addon that isn't installed contributes no tab.
 */

import type { ColumnDef } from "@tanstack/react-table";

// Stub hook that returns empty columns - tab will be hidden when no columns
export const useColumns = (): ColumnDef<any>[] => {
  return [];
};

// Mark as stub for detection
(useColumns as any).__isStub = true;

// Default export for compatibility
export default { useColumns };
