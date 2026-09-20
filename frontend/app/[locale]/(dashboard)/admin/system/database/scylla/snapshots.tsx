"use client";

import { useCallback, useEffect, useState } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ObjectTable } from "@/components/ui/object-table";
import { Database, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { RestoreModal } from "./restore-modal";

export interface Snapshot {
  filename: string;
  createdAt: string;
  size: number;
  tables: number | null;
  keyspaces: string[];
  readable: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GiB`;
}

export function Snapshots() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  // Starts true so the first render reads as loading without the effect having
  // to set it: a setState reached synchronously from an effect body cascades a
  // render, and this package lints for it.
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Snapshot | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // Bumped to ask for a refetch. The list is owned by the effect below and by
  // nothing else, so every path that changes the snapshots on disk — create,
  // delete, restore — just asks for a reload rather than each maintaining its
  // own copy of the fetch.
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await $fetch({
        url: "/api/admin/system/database/scylla/backup",
        silent: true,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setSnapshots(data);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const createSnapshot = async () => {
    setIsWorking(true);
    setWarnings([]);
    const { error } = await $fetch({
      url: "/api/admin/system/database/scylla/backup",
      method: "POST",
    });
    if (!error) reload();
    setIsWorking(false);
  };

  const deleteSnapshot = async (filename: string) => {
    setIsWorking(true);
    const { error } = await $fetch({
      url: "/api/admin/system/database/scylla/backup",
      method: "DELETE",
      body: { filename },
    });
    if (!error) reload();
    setIsWorking(false);
  };

  const restoreSnapshot = async (mode: "merge" | "replace") => {
    if (!restoreTarget) return;
    setIsWorking(true);
    setWarnings([]);
    const { data, error } = await $fetch({
      url: "/api/admin/system/database/scylla/restore",
      method: "POST",
      body: {
        backupFile: restoreTarget.filename,
        mode,
        createMissingSchema: true,
      },
    });
    if (!error) {
      // The restore reports what it could not do and what the operator must do
      // next — chiefly that the matching engine still holds the old book in
      // memory. Losing that behind a toast is how a restore looks complete and
      // is not.
      if (data && Array.isArray(data.warnings)) setWarnings(data.warnings);
      setRestoreTarget(null);
      reload();
    }
    setIsWorking(false);
  };

  const columns: ColumnDef<Snapshot>[] = [
    {
      accessorKey: "filename",
      header: t("snapshot"),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("filename")}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: tCommon("created_at"),
      cell: ({ row }) => {
        const raw = row.getValue("createdAt") as string;
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? raw : format(d, "PPP p");
      },
    },
    {
      accessorKey: "size",
      header: tCommon("size"),
      cell: ({ row }) => formatSize(row.getValue("size") as number),
    },
    {
      accessorKey: "tables",
      header: t("tables"),
      cell: ({ row }) => {
        const n = row.getValue("tables") as number | null;
        const s = row.original;
        if (!s.readable) {
          return <Badge variant="destructive">{t("unreadable")}</Badge>;
        }
        return (
          <span className="text-xs text-muted-foreground">
            {n ?? "—"}
            {s.keyspaces?.length ? ` · ${s.keyspaces.join(", ")}` : ""}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isWorking || !row.original.readable}
            onClick={() => setRestoreTarget(row.original)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {tCommon("restore")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isWorking}
            onClick={() => deleteSnapshot(row.original.filename)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{tCommon("delete")}</span>
          </Button>
        </div>
      ),
    },
  ];

  const actionButtons = (
    <Button
      onClick={createSnapshot}
      disabled={isWorking || isLoading}
      className="flex items-center gap-2"
      size="sm"
    >
      <Save className="h-4 w-4" />
      {isWorking ? `${t("working")}…` : t("create_snapshot")}
    </Button>
  );

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <ObjectTable
        columns={columns}
        data={snapshots}
        title={t("scylladb_snapshots")}
        titleAs="h2"
        actionButtons={actionButtons}
        searchPlaceholder={t("search_snapshots")}
        emptyMessage={t("no_snapshots_yet")}
      />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t("scylla_snapshot_explainer")}</span>
      </p>

      {restoreTarget && (
        <RestoreModal
          isOpen={Boolean(restoreTarget)}
          onClose={() => setRestoreTarget(null)}
          onConfirm={restoreSnapshot}
          snapshot={restoreTarget}
          isLoading={isWorking}
        />
      )}
    </div>
  );
}
