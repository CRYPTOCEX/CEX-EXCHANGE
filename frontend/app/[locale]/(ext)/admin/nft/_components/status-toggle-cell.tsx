"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { $fetch } from "@/lib/api";
import { useTableStore } from "@/components/blocks/data-table/store";

/**
 * Shared admin/NFT status toggle cell.
 *
 * The underlying Sequelize models use enum-typed `status` strings
 * (e.g. "ACTIVE", "CANCELLED", "MINTED", "BURNED"), so a plain
 * `<ToggleCell>` — which treats `value` as boolean — can't reflect
 * the correct on/off state. This component accepts an `isActive`
 * predicate to derive the boolean, and sends `{status: boolean}` to
 * the standard `/:id/status` admin endpoint. The backend handler maps
 * the boolean back to the appropriate enum value per-resource.
 */
export function createNftStatusToggleCell(
  isActive: (value: any, row: any) => boolean
) {
  return function NftStatusToggleCell(value: any, row: any) {
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState<boolean>(isActive(value, row));
    const apiEndpoint = useTableStore((state) => state.apiEndpoint);

    const handleChange = async (next: boolean) => {
      const prev = checked;
      setChecked(next);
      setLoading(true);
      try {
        const { error } = await $fetch({
          url: `${apiEndpoint}/${row.id}/status`,
          method: "PUT",
          body: { status: next },
          silentSuccess: true,
        });
        if (error) {
          setChecked(prev);
        }
      } catch {
        setChecked(prev);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Switch
        id={`nft-status-${row.id}`}
        checked={checked}
        onCheckedChange={handleChange}
        disabled={loading}
      />
    );
  };
}
