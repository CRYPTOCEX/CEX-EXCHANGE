"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Snapshot } from "./snapshots";

interface RestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: "merge" | "replace") => void;
  snapshot: Snapshot;
  isLoading: boolean;
}

/**
 * Restore is offered in two modes because only one of them is reversible in any
 * practical sense.
 *
 * `merge` upserts the snapshot's rows and deletes nothing, so a row written
 * since the snapshot survives. `replace` truncates each table in the snapshot
 * first — it reproduces the snapshot exactly and destroys everything written
 * since. Merge is preselected, and replace has to be chosen deliberately.
 */
export function RestoreModal({
  isOpen,
  onClose,
  onConfirm,
  snapshot,
  isLoading,
}: RestoreModalProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("confirm_restore")}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{snapshot.filename}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label
            className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
              mode === "merge" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="restore-mode"
              className="mt-1"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
              disabled={isLoading}
            />
            <span className="text-sm">
              <span className="font-medium">{t("restore_mode_merge")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("restore_mode_merge_hint")}
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer gap-3 rounded-md border p-3 ${
              mode === "replace" ? "border-destructive bg-destructive/5" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="restore-mode"
              className="mt-1"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              disabled={isLoading}
            />
            <span className="text-sm">
              <span className="font-medium">{t("restore_mode_replace")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("restore_mode_replace_hint")}
              </span>
            </span>
          </label>

          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>{t("restore_engine_warning")}</AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={mode === "replace" ? "destructive" : "default"}
            onClick={() => onConfirm(mode)}
            disabled={isLoading}
          >
            {isLoading ? `${t("restoring")}…` : tCommon("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
