"use client";
import { Database, CalendarIcon, FileText, FolderOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormConfig } from "@/components/blocks/data-table/types/table";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { useTranslations } from "next-intl";

interface Backup {
  filename: string;
  path: string;
  createdAt: string;
}

/**
 * `onRestore` is required, not optional.
 *
 * There was no actions column at all, so `setRestoreFile` in page.tsx was only
 * ever called with `null` — from the post-restore reset and the modal's own
 * onClose. `restoreFile` could therefore never hold a filename, the
 * `{restoreFile && ...}` guard never passed, and RestoreModal was unreachable
 * code. The backup list rendered, the restore path existed on the server, and
 * nothing in the UI could reach it.
 *
 * Making the callback required means a future caller cannot reintroduce that
 * by forgetting to pass it.
 */
export function useColumns(
  onRestore: (filename: string) => void
): ColumnDef<Backup>[] {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      accessorKey: "filename",
      header: t("filename"),
      cell: ({ row }) => row.getValue("filename"),
    },
    {
      accessorKey: "path",
      header: tCommon("path"),
      cell: ({ row }) => row.getValue("path"),
    },
    {
      accessorKey: "createdAt",
      header: tCommon("created_at"),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return format(new Date(date), "PPP p");
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRestore(row.original.filename)}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {tCommon("restore")}
        </Button>
      ),
    },
  ];
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  return {
    create: {
      title: t("create_backup"),
      description: t("initialize_a_new_database_backup_job"),
      groups: [
        {
          id: "backup-info",
          title: t("backup_information"),
          icon: Database,
          priority: 1,
          fields: [],
        },
      ],
    },
    edit: {
      title: t("backup_details"),
      description: t("view_database_backup_information"),
      groups: [
        {
          id: "backup-info",
          title: t("backup_information"),
          icon: Database,
          priority: 1,
          fields: [
            { key: "filename", required: true },
            { key: "path", required: true },
            { key: "createdAt", required: true },
          ],
        },
      ],
    },
  };
}
