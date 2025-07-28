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
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import BlockchainDialog from "./dialog";
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

export default function BlockchainConfiguration() {
  const t = useTranslations("ext");
  const [blockchains, setBlockchains] = useState<icoBlockchainAttributes[]>([]);
  const [selectedBlockchain, setSelectedBlockchain] =
    useState<icoBlockchainAttributes | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchBlockchains();
  }, []);

  async function fetchBlockchains() {
    setIsLoading(true);
    setError(null);

    const { data, error } = await $fetch({
      url: "/api/admin/ico/settings/blockchain",
      silent: true,
    });

    if (error) {
      setError("Failed to load blockchain configurations");
    } else if (data) {
      // Coerce status to boolean in case it comes as a string
      const coerced = data.map((item) => ({
        ...item,
        status: !!item.status,
      }));
      setBlockchains(coerced);
    }
    setIsLoading(false);
  }

  function handleAdd() {
    setSelectedBlockchain(null);
    setDialogMode("add");
    setDialogOpen(true);
  }

  function handleEdit(blockchain: icoBlockchainAttributes) {
    setSelectedBlockchain(blockchain);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function openDeleteDialog(blockchain: icoBlockchainAttributes) {
    setSelectedBlockchain(blockchain);
    setDeleteDialogOpen(true);
  }

  async function handleStatusToggle(
    blockchain: icoBlockchainAttributes,
    newStatus: boolean
  ) {
    const { error } = await $fetch({
      url: `/api/admin/ico/settings/blockchain/${blockchain.id}/status`,
      method: "PUT",
      body: { status: newStatus },
    });

    if (!error) {
      // Update the local state if the request was successful
      setBlockchains((prev) =>
        prev.map((b) =>
          b.id === blockchain.id ? { ...b, status: newStatus } : b
        )
      );
    }
  }

  async function handleConfirmDelete() {
    if (!selectedBlockchain) return;
    setIsSaving(true);
    setError(null);

    const { error } = await $fetch({
      url: `/api/admin/ico/settings/blockchain/${selectedBlockchain.id}`,
      method: "DELETE",
    });

    if (error) {
      setError("Failed to delete blockchain configuration");
    } else {
      await fetchBlockchains();
    }
    setIsSaving(false);
    setDeleteDialogOpen(false);
    setSelectedBlockchain(null);
  }

  async function handleDialogSuccess() {
    setDialogOpen(false);
    await fetchBlockchains();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t("blockchain_configuration")}</CardTitle>
          <CardDescription className="mt-1.5">
            {t("manage_the_blockchains_token_launches")}.
          </CardDescription>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("add_blockchain")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-4 text-center">{t("loading_configurations")}.</div>
        ) : blockchains.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            {t("no_blockchains_found")}. {t("add_your_first_blockchain_above")}.
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>{t("display_name")}</TableHead>
                <TableHead>{t("Value")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockchains.map((blockchain, index) => (
                <TableRow
                  key={blockchain.id}
                  className={cn(
                    "hover:bg-muted/50",
                    index % 2 === 0 ? "bg-muted/5" : ""
                  )}
                >
                  <TableCell>{blockchain.name}</TableCell>
                  <TableCell>{blockchain.value}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={blockchain.status}
                        onCheckedChange={(checked) =>
                          handleStatusToggle(blockchain, checked)
                        }
                      />
                      <span>{blockchain.status ? "Enabled" : "Disabled"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(blockchain)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openDeleteDialog(blockchain)}
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
        <BlockchainDialog
          mode={dialogMode}
          blockchain={selectedBlockchain}
          onClose={() => setDialogOpen(false)}
          onSuccess={handleDialogSuccess}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("are_you_sure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("this_will_permanently_delete_the_blockchain")}
              {selectedBlockchain?.name}. {t("this_action_cannot_be_undone")}.
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
