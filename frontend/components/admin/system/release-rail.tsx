"use client";

import type { PatchNoteVersion } from "@/store/patch-notes";
import { compareVersions } from "@/lib/version-compare";
import { cn } from "@/lib/utils";

/**
 * The list of published releases, marked against what is installed.
 *
 * ===========================================================================
 * COMPARE, DO NOT MATCH
 * ===========================================================================
 * The marker on each row is a `compareVersions` result, not an equality test,
 * because THE INSTALLED BUILD IS OFTEN NOT IN THE CATALOGUE — see the file note
 * on `lib/version-compare.ts`. Written as `v.version === installedVersion` the
 * "installed" chip simply never drew on the installs where it mattered most,
 * and a reader had no way to tell which entries were already on the box.
 *
 * Three markers, and each one answers a different question:
 *
 *   installed   this row IS the running build
 *   available   this row is what the updater is offering RIGHT NOW — which is
 *               not always the newest published release, because the updater
 *               and the catalogue are different services with different caches
 *   newer       published, ahead of the install, not currently on offer
 *
 * Shared by `admin/system/update` (core) and `admin/system/extension/[id]`
 * (add-ons). It was private to the second; the first needed the identical rail
 * against the identical data, and a copy is how the two consoles start
 * disagreeing about which release you are on.
 */
export function ReleaseRail({
  versions,
  installedVersion,
  availableVersion,
  selected,
  onSelect,
}: {
  versions: PatchNoteVersion[];
  installedVersion: string;
  availableVersion: string | null;
  selected: string | null;
  onSelect: (version: string) => void;
}) {
  return (
    <div className="max-h-[34rem] overflow-y-auto">
      <div className="space-y-0.5">
        {versions.map((v) => {
          const cmp = compareVersions(v.version, installedVersion);
          const isSelected = selected === v.version;
          const isAvailable =
            availableVersion !== null &&
            compareVersions(v.version, availableVersion) === 0;

          return (
            <button
              key={v.version}
              type="button"
              onClick={() => onSelect(v.version)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                /* `border-s-2` on every row, transparent when idle, so
                   selecting one does not shift the other rows by two pixels. */
                "w-full border-s-2 px-3 py-2 text-left transition-colors",
                "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isSelected
                  ? /* A RAIL AND A TINT, NOT A SOLID BLOCK. It was
                       `bg-primary text-primary-foreground`, i.e. a filled
                       accent slab per selected list row — R2's accent spent on
                       a selection state, and loud enough that the `current`
                       badge inside it needed its own
                       `border-primary-foreground/50` override to stay legible. */
                    "border-s-primary bg-accent text-foreground"
                  : "border-s-transparent hover:bg-accent/50"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm tabular-nums">
                  v{v.version}
                </span>
                {cmp === 0 ? (
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    installed
                  </span>
                ) : isAvailable ? (
                  <span className="shrink-0 text-[11px] font-medium text-warning">
                    available
                  </span>
                ) : cmp > 0 ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    newer
                  </span>
                ) : null}
              </div>
              {v.metadata.releaseDate ? (
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {v.metadata.releaseDate}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
