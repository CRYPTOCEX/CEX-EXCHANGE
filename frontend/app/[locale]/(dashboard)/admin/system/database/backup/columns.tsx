"use client";
import { Database, CalendarIcon, FileText, FolderOpen } from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { useTranslations } from "next-intl";

interface Backup {
  filename: string;
  path: string;
  createdAt: string;
}

export function useColumns(): ColumnDef<Backup>[] {
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
      header: t("path"),
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
