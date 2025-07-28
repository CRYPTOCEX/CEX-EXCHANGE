"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import TokenTypeDialog from "./dialog";
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
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function TokenTypeConfiguration() {
  const t = useTranslations("ext");
  const [tokenTypes, setTokenTypes] = useState<icoTokenTypeAttributes[]>([]);
  const [selectedTokenType, setSelectedTokenType] =
    useState<icoTokenTypeAttributes | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchTokenTypes();
  }, []);

  async function fetchTokenTypes() {
    setIsLoading(true);
    setError(null);

    const { data, error } = await $fetch<icoTokenTypeAttributes[]>({
      url: "/api/admin/ico/settings/token/type",
      silent: true,
    });

    if (error) {
      setError("Failed to load token type configurations");
    } else if (data) {
      // Coerce status to boolean in case it comes as a string
      const coerced = data.map((item) => ({
        ...item,
        status: !!item.status,
      }));
      setTokenTypes(coerced);
    }
    setIsLoading(false);
  }

  function handleAdd() {
    setSelectedTokenType(null);
    setDialogMode("add");
    setDialogOpen(true);
  }

  function handleEdit(tokenType: icoTokenTypeAttributes) {
    setSelectedTokenType(tokenType);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function openDeleteDialog(tokenType: icoTokenTypeAttributes) {
    setSelectedTokenType(tokenType);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!selectedTokenType) return;
    setIsSaving(true);
    setError(null);

    const { error } = await $fetch({
      url: `/api/admin/ico/settings/token/type/${selectedTokenType.id}`,
      method: "DELETE",
    });

    if (error) {
      setError("Failed to delete token type configuration");
    } else {
      await fetchTokenTypes();
    }
    setIsSaving(false);
    setDeleteDialogOpen(false);
    setSelectedTokenType(null);
  }

  async function handleStatusToggle(
    tokenType: icoTokenTypeAttributes,
    newStatus: boolean
  ) {
    const { error } = await $fetch({
      url: `/api/admin/ico/settings/token/type/${tokenType.id}/status`,
      method: "PUT",
      body: { status: newStatus },
    });

    if (!error) {
      // Update only the clicked token type's status in local state.
      setTokenTypes((prev) =>
        prev.map((t) =>
          t.id === tokenType.id ? { ...t, status: newStatus } : t
        )
      );
    }
  }

  async function handleDialogSuccess() {
    setDialogOpen(false);
    await fetchTokenTypes();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t("token_type_configuration")}</CardTitle>
          <CardDescription className="mt-1.5">
            {t("manage_which_token_token_launches")}.
          </CardDescription>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("add_token_type")}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <div className="mb-4 text-destructive">{error}</div>}

        {isLoading ? (
          <div className="py-4 text-center">{t("loading_configurations")}.</div>
        ) : tokenTypes.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            {t("no_token_types_found")}. {t("add_your_first_token_type_above")}.
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>{t("display_name")}</TableHead>
                <TableHead>{t("Value")}</TableHead>
                <TableHead>{t("Description")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokenTypes.map((tokenType, index) => (
                <TableRow
                  key={tokenType.id}
                  className={cn(
                    "hover:bg-muted/50",
                    index % 2 === 0 ? "bg-muted/5" : ""
                  )}
                >
                  <TableCell>{tokenType.name}</TableCell>
                  <TableCell>{tokenType.value}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {tokenType.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={tokenType.status}
                        onCheckedChange={(checked) =>
                          handleStatusToggle(tokenType, checked)
                        }
                      />
                      <span>{tokenType.status ? "Enabled" : "Disabled"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(tokenType)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openDeleteDialog(tokenType)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {dialogOpen && (
        <TokenTypeDialog
          mode={dialogMode}
          tokenType={selectedTokenType}
          onClose={() => setDialogOpen(false)}
          onSuccess={handleDialogSuccess}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("this_will_permanently_delete_the_token_type")}
              {selectedTokenType?.name}. {t("this_action_cannot_be_undone")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              variant={"destructive"}
              disabled={isSaving}
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
