"use client";

/**
 * Which modules appear on the home page, and in what order.
 *
 * `extensionSections` is a MAP keyed by module id, holding `{enabled, order}`.
 * A map, not an array, so a module the build does not ship yet simply has no
 * entry and picks up its default position when it arrives — which is why the
 * catalogue below is the full list rather than what is installed.
 *
 * Reordering rewrites `order` on the two rows that swapped, never renumbers the
 * whole map. A full renumber would write an entry for every module in the
 * catalogue on the first click, including ones the owner has never heard of,
 * and the stored document would grow every time somebody nudged a row.
 */

import * as React from "react";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HOME_MODULES } from "@/components/admin/studio/home-schema";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ModuleConfig {
  enabled?: boolean;
  order?: number;
}

export function HomeModulesPanel({
  value,
  savedValue,
  onChange,
  disabled,
}: {
  value: Record<string, ModuleConfig> | null | undefined;
  savedValue: Record<string, ModuleConfig> | null | undefined;
  onChange: (next: Record<string, ModuleConfig>) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  /* Memoised: `configFor` closes over `config`, so a fresh `{}` on every render
     would rebuild that callback and the sorted list beneath it each time. */
  const config = React.useMemo(() => value ?? {}, [value]);
  const saved = savedValue ?? {};

  /* A module with no entry is ON at its catalogue position — that is how the
     page reads it, and the editor has to agree or the switches lie on a fresh
     install. */
  const configFor = React.useCallback(
    (id: string): Required<ModuleConfig> => {
      const stored = config[id];
      return {
        enabled: stored?.enabled ?? true,
        order: stored?.order ?? HOME_MODULES.findIndex((m) => m.id === id),
      };
    },
    [config]
  );

  const sorted = React.useMemo(() => {
    return [...HOME_MODULES]
      .map((m, i) => ({ ...m, ...configFor(m.id), catalogueAt: i }))
      /* Ties broken by catalogue position, so the list can never reorder
         itself between renders — two modules sharing an `order` is a normal
         state on a partially-configured install. */
      .sort((a, b) => a.order - b.order || a.catalogueAt - b.catalogueAt);
  }, [configFor]);

  const move = (id: string, delta: -1 | 1) => {
    const at = sorted.findIndex((m) => m.id === id);
    const to = at + delta;
    if (at < 0 || to < 0 || to >= sorted.length) return;
    const a = sorted[at];
    const b = sorted[to];
    onChange({
      ...config,
      [a.id]: { enabled: a.enabled, order: b.order },
      [b.id]: { enabled: b.enabled, order: a.order },
    });
  };

  const enabledCount = sorted.filter((m) => m.enabled).length;

  return (
    <div className="space-y-1">
      <p className="px-0.5 pb-1 text-[11px] text-muted-foreground">
        <span className="tabular-nums font-medium text-foreground">{enabledCount}</span> of{" "}
        {sorted.length} enabled. A module only appears if its extension is installed.
      </p>

      {sorted.map((module, i) => {
        const storedSaved = saved[module.id];
        const savedEnabled = storedSaved?.enabled ?? true;
        const savedOrder =
          storedSaved?.order ?? HOME_MODULES.findIndex((m) => m.id === module.id);
        const edited = module.enabled !== savedEnabled || module.order !== savedOrder;

        return (
          <div
            key={module.id}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border bg-card px-1.5 py-1.5",
              !module.enabled && "opacity-60"
            )}
          >
            <span className="flex shrink-0 flex-col">
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-4"
                disabled={disabled || i === 0}
                onClick={() => move(module.id, -1)}
                aria-label={t("move_up_2", { name: String(module.name) })}
              >
                <GripVertical className="size-3 rotate-90" aria-hidden="true" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="h-4"
                disabled={disabled || i === sorted.length - 1}
                onClick={() => move(module.id, 1)}
                aria-label={t("move_down_2", { name: String(module.name) })}
              >
                <GripVertical className="size-3 -rotate-90" aria-hidden="true" />
              </Button>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                {edited ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary">
                    <span className="sr-only">Changed. </span>
                  </span>
                ) : null}
                <span className="truncate text-[11px] font-medium text-foreground">
                  {module.name}
                </span>
              </span>
              <span className="block truncate text-[10px] text-subtle-foreground">
                {module.description}
              </span>
            </span>

            <Switch
              checked={module.enabled}
              onCheckedChange={(next) =>
                onChange({
                  ...config,
                  [module.id]: { enabled: next, order: module.order },
                })
              }
              disabled={disabled}
              aria-label={t("show_1", { name: String(module.name) })}
              className="shrink-0"
            />
          </div>
        );
      })}
    </div>
  );
}
