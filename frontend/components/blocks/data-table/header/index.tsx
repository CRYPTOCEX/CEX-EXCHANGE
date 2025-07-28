import React from "react";
import { cn } from "@/lib/utils";
import { HeaderClient } from "./header.client";
import { HeaderCreateButton } from "./header-create-button";

interface TableHeaderProps {
  title: string;
  itemTitle: string;
  description?: string;
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
  // extraTopButtons is now a function that receives a refresh callback
  extraTopButtons?: (refresh?: () => void) => React.ReactNode;
  refresh: () => void;
}

export function TableHeader({
  title,
  itemTitle,
  description,
  createDialog,
  dialogSize,
  extraTopButtons,
  refresh,
}: TableHeaderProps) {
  if (!title) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        "sm:ltr:flex-row sm:rtl:flex-row-reverse"
      )}
    >
      <div className="flex flex-col gap-1">
        <div
          className={cn(
            "flex items-center gap-2",
            "ltr:flex-row rtl:flex-row-reverse"
          )}
        >
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
          <HeaderClient />
        </div>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div
        className={cn(
          "flex items-center gap-2",
          "ltr:flex-row rtl:flex-row-reverse"
        )}
      >
        {extraTopButtons && (
          <div className="flex items-center gap-2">
            {extraTopButtons(refresh)}
          </div>
        )}
        <HeaderCreateButton
          itemTitle={itemTitle}
          createDialog={createDialog}
          dialogSize={dialogSize}
        />
      </div>
    </div>
  );
}
