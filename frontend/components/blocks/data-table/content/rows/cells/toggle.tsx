"use client";
import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { $fetch } from "@/lib/api";
import { useTableStore } from "../../../store";
import { processEndpointLink } from "../../../utils/cell";

export interface ToggleConfig {
  /**
   * A URL template where placeholders in the form `[key]` (for example, `[id]`)
   * are replaced with values from the row. For example: "/api/admin/finance/currency/fiat/[id]/status".
   */
  url: string;
  /** HTTP method to use (defaults to "PUT") */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  /** The field name in the payload (defaults to "status") */
  field?: string;
  /** Value to send when the switch is turned ON (defaults to true) */
  trueValue?: any;
  /** Value to send when the switch is turned OFF (defaults to false) */
  falseValue?: any;
}

interface ToggleCellProps {
  /** Current boolean value for this cell */
  value: boolean;
  /** The entire row data (used to substitute template placeholders) */
  row: any;
  /** Optional configuration to override default API behavior */
  config?: ToggleConfig;
}

/**
 * ToggleCell renders a Switch that sends an API request when toggled.
 * It uses the configuration provided in the column's render.config.
 */
export function ToggleCell({ value, row, config }: ToggleCellProps) {
  const [loading, setLoading] = useState(false);
  const storeEndpoint = useTableStore((state) => state.apiEndpoint);

  // Destructure config or set defaults
  const {
    url,
    method = "PUT",
    field = "status",
    trueValue = true,
    falseValue = false,
  } = config || {};

  // Process URL template if provided, else use store endpoint with row.id
  const endpoint = url
    ? processEndpointLink(url, row)
    : `${storeEndpoint}/${row.id}/status`;

  const handleChange = async (checked: boolean) => {
    setLoading(true);
    try {
      const payload = { [field]: checked ? trueValue : falseValue };
      const { error } = await $fetch({
        url: endpoint,
        method,
        body: payload,
        silentSuccess: true,
      });
      if (!error) {
        // Update only the affected row's field in the store
        useTableStore.setState((state) => ({
          data: state.data.map((r) =>
            r.id === row.id ? { ...r, [field]: payload[field] } : r
          ),
        }));
      }
    } catch (err) {
      console.error("Error updating toggle:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch
      id={`toggle-${row.id}`}
      checked={!!value}
      onCheckedChange={handleChange}
      disabled={loading}
    />
  );
}
