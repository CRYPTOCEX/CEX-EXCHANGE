"use client";

import { useEffect, useMemo, useState } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, Info, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecordEditor } from "./record-editor";

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

export function Records() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [schema, setSchema] = useState<TableMeta[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [pageState, setPageState] = useState<string | null>(null);
  // Every cursor seen so far, so "previous" can walk back. CQL paging is
  // forward-only — the driver's page state points at the next page and there is
  // no reverse cursor to ask for.
  const [history, setHistory] = useState<(string | null)[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);

  const current = useMemo(
    () => schema.find((s) => `${s.keyspace}.${s.table}` === selected) ?? null,
    [schema, selected]
  );

  useEffect(() => {
    (async () => {
      const { data, error: err } = await $fetch({
        url: "/api/admin/system/database/scylla/schema",
        silent: true,
      });
      if (!err && data?.tables) {
        setSchema(data.tables);
        if (data.tables.length) {
          setSelected(`${data.tables[0].keyspace}.${data.tables[0].table}`);
        }
      }
    })();
  }, []);

  // One effect owns the row fetch. Everything that changes what should be on
  // screen — a different table, a new filter, a page step, a delete — moves
  // `cursor` or bumps `reloadToken` and lets the effect do the work, so there is
  // exactly one place that reads rows and one place that clears the error.
  const [cursor, setCursor] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [appliedFilter, setAppliedFilter] = useState("");

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({
        keyspace: current.keyspace,
        table: current.table,
        limit: "50",
      });
      if (cursor) params.set("pageState", cursor);
      if (appliedFilter.trim()) params.set("filter", appliedFilter.trim());

      const { data, error: err } = await $fetch({
        url: `/api/admin/system/database/scylla/records?${params.toString()}`,
        silent: true,
      });
      if (cancelled) return;
      if (err) {
        setError(typeof err === "string" ? err : t("record_query_failed"));
        setRows([]);
        setPageState(null);
      } else {
        setError(null);
        setRows(data?.rows ?? []);
        setPageState(data?.pageState ?? null);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [current, cursor, appliedFilter, reloadToken, t]);

  /** Re-run the query from the first page with whatever is typed in the box. */
  const applyFilter = () => {
    setIsLoading(true);
    setHistory([]);
    setCursor(null);
    setAppliedFilter(filter);
    setReloadToken((n) => n + 1);
  };

  const deleteRow = async (row: Record<string, any>) => {
    if (!current) return;
    const key: Record<string, any> = {};
    for (const k of [...current.partitionKey, ...current.clusteringKey]) key[k] = row[k];
    setIsLoading(true);
    const { error: err } = await $fetch({
      url: "/api/admin/system/database/scylla/records",
      method: "DELETE",
      body: { keyspace: current.keyspace, table: current.table, key },
    });
    if (!err) setReloadToken((n) => n + 1);
    setIsLoading(false);
  };

  const displayColumns = current ? current.columns.map((c) => c.name) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <label className="mb-1 block text-xs text-muted-foreground">
            {t("table")}
          </label>
          <Select
            value={selected}
            onValueChange={(v) => {
              setIsLoading(true);
              setSelected(v);
              setHistory([]);
              setCursor(null);
              setAppliedFilter("");
              setFilter("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("select_a_table")} />
            </SelectTrigger>
            <SelectContent>
              {schema.map((s) => (
                <SelectItem
                  key={`${s.keyspace}.${s.table}`}
                  value={`${s.keyspace}.${s.table}`}
                >
                  {s.keyspace}.{s.table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[280px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            {current
              ? t("filter_by_partition_key", {
                  keys: current.partitionKey.join(", "),
                })
              : t("filter")}
          </label>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={
              current
                ? `{${current.partitionKey.map((k) => `"${k}": "…"`).join(", ")}}`
                : "{}"
            }
            className="font-mono text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilter();
            }}
          />
        </div>

        <Button size="sm" onClick={applyFilter} disabled={isLoading}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          {tCommon("refresh")}
        </Button>
      </div>

      {current && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {t("partition_key_scan_note", {
              keys: current.partitionKey.join(", "),
            })}
          </span>
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {displayColumns.map((c) => {
                const meta = current?.columns.find((x) => x.name === c);
                return (
                  <TableHead key={c} className="whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      {c}
                      {meta && meta.kind !== "regular" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {meta.kind === "partition_key" ? "PK" : "CK"}
                        </Badge>
                      )}
                    </span>
                  </TableHead>
                );
              })}
              <TableHead className="text-right">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={displayColumns.length + 1}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {isLoading ? `${tCommon("loading")}…` : t("no_records")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, i) => (
              <TableRow key={i}>
                {displayColumns.map((c) => (
                  <TableCell
                    key={c}
                    className="max-w-[220px] truncate font-mono text-xs"
                    title={row[c] === null ? "null" : String(row[c])}
                  >
                    {row[c] === null ? (
                      <span className="text-muted-foreground/60">null</span>
                    ) : (
                      String(row[c])
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(row)}
                      disabled={isLoading}
                    >
                      {tCommon("edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRow(row)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{tCommon("delete")}</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t("rows_on_this_page", { count: rows.length })}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || history.length === 0}
            onClick={() => {
              const prev = history[history.length - 1] ?? null;
              setIsLoading(true);
              setHistory((h) => h.slice(0, -1));
              setCursor(prev);
            }}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || !pageState}
            onClick={() => {
              setIsLoading(true);
              setHistory((h) => [...h, cursor]);
              setCursor(pageState);
            }}
          >
            {t("next")}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {editing && current && (
        <RecordEditor
          isOpen={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReloadToken((n) => n + 1);
          }}
          row={editing}
          meta={current}
        />
      )}
    </div>
  );
}
