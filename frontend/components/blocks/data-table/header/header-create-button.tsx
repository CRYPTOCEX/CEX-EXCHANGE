"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";
import { Link } from "@/i18n/routing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface HeaderCreateButtonProps {
  itemTitle: string;
  createDialog?: React.ReactNode;
  dialogSize?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | undefined;
}

export function HeaderCreateButton({
  itemTitle,
  createDialog,
  dialogSize,
}: HeaderCreateButtonProps) {
  const t = useTranslations(
    "components/blocks/data-table/header/header-create-button"
  );
  const tableConfig = useTableStore((state) => state.tableConfig);
  const setCreateDrawerOpen = useTableStore(
    (state) => state.setCreateDrawerOpen
  );
  const hasCreatePermission = useTableStore(
    (state) => state.hasCreatePermission
  );

  // Use the props first, falling back to tableConfig values if not provided.
  const effectiveCreateDialog = createDialog ?? tableConfig.createDialog;
  // Only allow supported dialog sizes
  const allowedDialogSizes = [
    "sm",
    "md",
    "lg",
    "xl",
    "2xl",
    "3xl",
    "4xl",
    "5xl",
    "6xl",
    "7xl",
    undefined,
  ] as const;
  const rawDialogSize = dialogSize ?? tableConfig.dialogSize;
  const effectiveDialogSize = allowedDialogSizes.includes(
    rawDialogSize as (typeof allowedDialogSizes)[number]
  )
    ? (rawDialogSize as (typeof allowedDialogSizes)[number])
    : undefined;

  if (!tableConfig.canCreate) {
    return null;
  }

  if (effectiveCreateDialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" disabled={!hasCreatePermission}>
            <Plus className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
            {t("Add")} {itemTitle}
          </Button>
        </DialogTrigger>
        <DialogContent size={effectiveDialogSize}>
          <DialogTitle>
            {t("New")} {itemTitle}
          </DialogTitle>
          <DialogDescription>
            {t("create_a_new")} {itemTitle} {t("by_filling_out_the_form_below")}
            .
          </DialogDescription>
          {effectiveCreateDialog}
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback: if a createLink exists or use the default drawer behavior.
  const handleCreateClick = () => {
    if (tableConfig.createLink) {
      return;
    }
    setCreateDrawerOpen(true);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            {tableConfig.createLink ? (
              <Link href={tableConfig.createLink} passHref>
                <Button size="sm" disabled={!hasCreatePermission}>
                  <Plus className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
                  {t("Add")} {itemTitle}
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                onClick={handleCreateClick}
                disabled={!hasCreatePermission}
              >
                <Plus className={cn("mr-2 h-4 w-4", "ltr:mr-2 rtl:ml-2")} />
                {t("Add")} {itemTitle}
              </Button>
            )}
          </span>
        </TooltipTrigger>
        {!hasCreatePermission && (
          <TooltipContent>
            <p>{t("you_dont_have_permission_to_create_new_items")}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
