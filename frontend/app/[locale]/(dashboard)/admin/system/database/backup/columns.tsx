"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArchiveRestoreIcon as Restore } from "lucide-react";
export type Backup = {
  filename: string;
  path: string;
  createdAt: string;
};
export const columns = (
  setRestoreFile: (filename: string) => void
): ColumnDef<Backup>[] => [
  {
    accessorKey: "filename",
    header: "Filename",
    enableSorting: true,
  },
  {
    accessorKey: "path",
    header: "Path",
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: () => {
      return <div className="text-right">Created At</div>;
    },
    enableSorting: true,
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <div className="text-right">{date.toLocaleString()}</div>;
    },
  },
  {
    id: "actions",
    header: () => {
      return <div className="text-right">Actions</div>;
    },
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRestoreFile(row.original.filename)}
            className="flex items-center gap-1"
          >
            <Restore className="h-4 w-4" />
            Restore
          </Button>
        </div>
      );
    },
  },
];
