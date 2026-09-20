"use client";

import { useState } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface ColumnMeta {
  name: string;
  type: string;
  kind: "partition_key" | "clustering" | "regular";
}
interface TableMeta {
  keyspace: string;
  table: string;
  partitionKey: string[];
  clusteringKey: string[];
  columns: ColumnMeta[];
}

interface RecordEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  row: Record<string, any>;
  meta: TableMeta;
}

/**
 * Primary-key columns are shown but not editable. A primary key is immutable in
 * CQL: "changing" one means deleting the row and inserting another, which is
 * not something an inline edit should do behind the operator's back. The
 * backend refuses it too.
 */
export function RecordEditor({
  isOpen,
  onClose,
  onSaved,
  row,
  meta,
}: RecordEditorProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const c of meta.columns) {
      if (c.kind === "regular") d[c.name] = row[c.name] === null ? "" : String(row[c.name]);
    }
    return d;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keyCols = [...meta.partitionKey, ...meta.clusteringKey];

  const save = async () => {
    setIsSaving(true);
    setError(null);
    const key: Record<string, any> = {};
    for (const k of keyCols) key[k] = row[k];

    const values: Record<string, any> = {};
    for (const c of meta.columns) {
      if (c.kind !== "regular") continue;
      const before = row[c.name] === null ? "" : String(row[c.name]);
      const after = draft[c.name] ?? "";
      if (before === after) continue;
      values[c.name] = after === "" ? null : after;
    }

    if (!Object.keys(values).length) {
      onClose();
      setIsSaving(false);
      return;
    }

    const { error: err } = await $fetch({
      url: "/api/admin/system/database/scylla/records",
      method: "PUT",
      body: { keyspace: meta.keyspace, table: meta.table, key, values },
    });
    if (err) setError(typeof err === "string" ? err : t("record_update_failed"));
    else onSaved();
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{t("edit_record")}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">
              {meta.keyspace}.{meta.table}
            </span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {meta.columns.map((c) => {
            const isKey = c.kind !== "regular";
            return (
              <div key={c.name}>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {c.type}
                  </Badge>
                  {isKey && (
                    <Badge variant="outline" className="text-[10px]">
                      {c.kind === "partition_key" ? "PK" : "CK"}
                    </Badge>
                  )}
                </label>
                <Input
                  className="font-mono text-xs"
                  disabled={isKey || isSaving}
                  value={
                    isKey
                      ? row[c.name] === null
                        ? ""
                        : String(row[c.name])
                      : (draft[c.name] ?? "")
                  }
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [c.name]: e.target.value }))
                  }
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? `${t("saving")}…` : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
