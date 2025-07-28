"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDirtyForm } from "@/context/dirty-form-context";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";

interface BlockchainDialogProps {
  mode: "add" | "edit";
  blockchain: icoBlockchainAttributes | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function BlockchainDialog({
  mode,
  blockchain,
  onClose,
  onSuccess,
}: BlockchainDialogProps) {
  const t = useTranslations("ext");
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const { isDirty, setDirty } = useDirtyForm();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isEdit && blockchain) {
      setName(blockchain.name);
      setValue(blockchain.value);
      setStatus(!!blockchain.status);
    } else {
      setName("");
      setValue("");
      setStatus(true);
    }
  }, [isEdit, blockchain]);

  useEffect(() => {
    const initialName = isEdit && blockchain ? blockchain.name : "";
    const initialValue = isEdit && blockchain ? blockchain.value : "";
    const initialStatus = isEdit && blockchain ? !!blockchain.status : true;
    setDirty(
      name !== initialName || value !== initialValue || status !== initialStatus
    );
  }, [name, value, status, isEdit, blockchain, setDirty]);

  async function handleSave() {
    if (!name || !value) {
      setIsSaving(false);
      return;
    }

    setIsSaving(true);

    if (isEdit && blockchain?.id) {
      const { error } = await $fetch({
        url: `/api/admin/ico/settings/blockchain/${blockchain.id}`,
        method: "PUT",
        body: { name, value, status },
      });
      if (error) {
        setIsSaving(false);
        return;
      }
    } else {
      const { error } = await $fetch({
        url: "/api/admin/ico/settings/blockchain",
        method: "POST",
        body: { name, value, status },
      });
      if (error) {
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    await onSuccess();
  }

  const handleClose = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      setDirty(false);
      onClose();
    }
  };

  const confirmAction = () => {
    setShowConfirm(false);
    setDirty(false);
    onClose();
  };

  const cancelAction = () => {
    setShowConfirm(false);
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Blockchain" : "Add New Blockchain"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the fields below to edit this blockchain."
              : "Fill in the details below to add a new blockchain."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="blockchain-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Solana"
            label="Display Name"
          />
          <Input
            id="blockchain-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. SOL"
            label="Value"
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="blockchain-status"
              checked={status}
              onCheckedChange={(checked) => setStatus(checked)}
            />
            <span>{status ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Add Blockchain"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discard_unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_unsaved_changes")}.{" "}
              {t("are_you_sure_you_want_to_discard_them")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAction}>
              {t("No")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} variant="destructive">
              {t("yes_discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
