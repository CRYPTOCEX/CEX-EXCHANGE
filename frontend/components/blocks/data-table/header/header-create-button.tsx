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
  const t = useTranslations("common");
  const tComponentsBlocks = useTranslations("components_blocks");
  const tableConfig = useTableStore((state) => state.tableConfig);
  const goToCreate = useTableStore((state) => state.goToCreate);
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
            <Plus className={cn("h-4 w-4", "sm:ltr:mr-2 sm:rtl:ml-2")} />
            <span className="hidden sm:inline">{t("add")} {itemTitle}</span>
          </Button>
        </DialogTrigger>
        <DialogContent size={effectiveDialogSize}>
          <DialogTitle>
            {t("new")} {itemTitle}
          </DialogTitle>
          <DialogDescription>
            {t("create_a_new")} {itemTitle} {tComponentsBlocks("by_filling_out_the_form_below")}
            .
          </DialogDescription>
          {effectiveCreateDialog}
        </DialogContent>
      </Dialog>
    );
  }

  // Fallback: if a createLink exists or use the view-based create.
  const handleCreateClick = () => {
    if (tableConfig.createLink) {
      return;
    }
    goToCreate();
  };

  const buttonLabel = `${t("add")} ${itemTitle}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            {tableConfig.createLink ? (
              <Link href={tableConfig.createLink} passHref>
                <Button size="sm" disabled={!hasCreatePermission}>
                  <Plus className={cn("h-4 w-4", "sm:ltr:mr-2 sm:rtl:ml-2")} />
                  <span className="hidden sm:inline">{buttonLabel}</span>
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                onClick={handleCreateClick}
                disabled={!hasCreatePermission}
              >
                <Plus className={cn("h-4 w-4", "sm:ltr:mr-2 sm:rtl:ml-2")} />
                <span className="hidden sm:inline">{buttonLabel}</span>
              </Button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{!hasCreatePermission ? tComponentsBlocks("you_dont_have_permission_to_create_new_items") : buttonLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
