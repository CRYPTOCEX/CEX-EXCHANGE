"use client";

/**
 * Extension Columns Stub
 *
 * This stub provides empty column hooks for optional extension tables.
 * When the extension addon is not installed, these stubs prevent import errors
 * and return empty columns (hiding the tab in the CRM user page).
 *
 * Supported extensions:
 * - ICO Transaction
 * - P2P Offer
 * - P2P Trade
 * - Staking Position
 * - Affiliate Referral
 * - Ecommerce Order
 * - Forex Transaction
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
