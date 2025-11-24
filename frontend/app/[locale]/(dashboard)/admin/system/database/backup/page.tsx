"use client";
import { useEffect, useState, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ObjectTable } from "@/components/ui/object-table";
import { columns } from "./columns";
import { BackupModal } from "./backup-modal";
import { RestoreModal } from "./restore-modal";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";

interface Backup {
  filename: string;
  path: string;
  createdAt: string;
}
export default function DatabaseBackupPage() {
  const t = useTranslations("dashboard");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: "/api/admin/system/database/backup",
      silent: true,
    });
    if (!error) {
      setBackups(data);
    }
    setIsLoading(false);
  }, []);
  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);
  const initiateBackup = async () => {
    setIsLoading(true);
    const { error } = await $fetch({
      url: "/api/admin/system/database/backup",
      method: "POST",
    });
    if (!error) {
      fetchBackups();
      setIsBackupModalOpen(false);
    }
    setIsLoading(false);
  };
  const restoreBackup = async (filename: string) => {
    setIsLoading(true);
    const { error } = await $fetch({
      url: "/api/admin/system/database/restore",
      method: "POST",
      body: { backupFile: filename },
    });
    if (!error) {
      fetchBackups();
      setRestoreFile(null);
    }
    setIsLoading(false);
  };
  const actionButtons = (
    <Button
      onClick={() => setIsBackupModalOpen(true)}
      className="flex items-center gap-2"
      size="sm"
    >
      <Save className="h-4 w-4" />
      {t("create_backup")}
    </Button>
  );
  return (
    <>
      <ObjectTable
        columns={columns(setRestoreFile)}
        data={backups}
        title="Database Backups"
        actionButtons={actionButtons}
        searchPlaceholder="Search backups..."
        emptyMessage="No database backups found. Create your first backup to get started."
      />
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onConfirm={initiateBackup}
        isLoading={isLoading}
      />
      {restoreFile && (
        <RestoreModal
          isOpen={Boolean(restoreFile)}
          onClose={() => setRestoreFile(null)}
          onConfirm={() => restoreBackup(restoreFile)}
          filename={restoreFile}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
