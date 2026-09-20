"use client";
import { useEffect, useState, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ObjectTable } from "@/components/ui/object-table";
import { useColumns, useFormConfig } from "./columns";
import { BackupModal } from "./backup-modal";
import { RestoreModal } from "./restore-modal";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

interface Backup {
  filename: string;
  path: string;
  createdAt: string;
}
export default function DatabaseBackupPage() {
  const t = useTranslations("dashboard_admin");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  /* Declared after setRestoreFile because the columns own the only control that
     can set it — without this the RestoreModal below is unreachable code. */
  const columns = useColumns(setRestoreFile);
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
    <PageShell rhythm="none">
      <ObjectTable
        columns={columns}
        data={backups}
        title={t("database_backups")}
        actionButtons={actionButtons}
        searchPlaceholder="Search backups..."
        emptyMessage={t("no_database_backups_found_create_your")}
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
    </PageShell>
  );
}
