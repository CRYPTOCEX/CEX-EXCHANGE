"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
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
  /**
   * Overrides `tableConfig.canCreate`, which is only correct AFTER the effect
   * that writes it. Undefined keeps the store as the source, for callers that
   * have no prop to give.
   */
  canCreate?: boolean;
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
  canCreate,
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

  if (!(canCreate ?? tableConfig.canCreate)) {
    return null;
  }

  if (effectiveCreateDialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" disabled={!hasCreatePermission}>
            {/* No icon margin: the button already lays its children out with
                gap-2, so a margin doubled the space next to the label and threw
                the icon off-centre once the label is hidden on mobile. */}
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add {itemTitle}</span>
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

  const buttonLabel = `${"Add"} ${itemTitle}`;

  return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            {/* The link form is only rendered when the admin may actually
                create. A <Link> wrapping a <Button> nests a button inside an
                anchor — invalid markup, and the anchor still navigated even
                while the button rendered as disabled. */}
            {tableConfig.createLink && hasCreatePermission ? (
              <Button size="sm" asChild>
                <Link href={tableConfig.createLink}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{buttonLabel}</span>
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCreateClick}
                disabled={!hasCreatePermission}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{buttonLabel}</span>
              </Button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{!hasCreatePermission ? tComponentsBlocks("you_dont_have_permission_to_create_new_items") : buttonLabel}</p>
        </TooltipContent>
      </Tooltip>
  );
}
