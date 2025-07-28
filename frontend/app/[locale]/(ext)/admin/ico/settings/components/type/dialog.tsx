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
import { Textarea } from "@/components/ui/textarea";
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

interface TokenTypeDialogProps {
  mode: "add" | "edit";
  tokenType: icoTokenTypeAttributes | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function TokenTypeDialog({
  mode,
  tokenType,
  onClose,
  onSuccess,
}: TokenTypeDialogProps) {
  const t = useTranslations("ext");
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const { isDirty, setDirty } = useDirtyForm();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isEdit && tokenType) {
      setName(tokenType.name);
      setValue(tokenType.value);
      setDescription(tokenType.description || "");
      setStatus(!!tokenType.status);
    } else {
      setName("");
      setValue("");
      setDescription("");
      setStatus(true);
    }
  }, [isEdit, tokenType]);

  useEffect(() => {
    const initialName = isEdit && tokenType ? tokenType.name : "";
    const initialValue = isEdit && tokenType ? tokenType.value : "";
    const initialDescription =
      isEdit && tokenType ? tokenType.description || "" : "";
    const initialStatus = isEdit && tokenType ? !!tokenType.status : true;
    setDirty(
      name !== initialName ||
        value !== initialValue ||
        description !== initialDescription ||
        status !== initialStatus
    );
  }, [name, value, description, status, isEdit, tokenType, setDirty]);

  async function handleSave() {
    if (!name || !value || !description) {
      setIsSaving(false);
      return;
    }

    setIsSaving(true);

    if (isEdit && tokenType?.id) {
      const { error } = await $fetch({
        url: `/api/admin/ico/settings/token/type/${tokenType.id}`,
        method: "PUT",
        body: { name, value, description, status },
      });
      if (error) {
        setIsSaving(false);
        return;
      }
    } else {
      const { error } = await $fetch({
        url: "/api/admin/ico/settings/token/type",
        method: "POST",
        body: { name, value, description, status },
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
            {isEdit ? "Edit Token Type" : "Add New Token Type"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the token type configuration."
              : "Fill in the details below to add a new token type."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="token-type-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Governance Token"
            label="Display Name"
          />
          <Input
            id="token-type-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. governance"
            label="Value"
          />
          <Textarea
            id="token-type-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this token type and its use cases"
            label="Description"
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="token-type-status"
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
                : "Add Token Type"}
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
