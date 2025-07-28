"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckSquare,
  ChevronDown,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface FAQBulkActionsProps {
  bulkEditMode: boolean;
  selectedFaqs: string[];
  totalFaqs: number;
  onToggleBulkEdit: () => void;
  onBulkAction: (action: string) => void;
  onToggleSelectAll: () => void;
}

export function FAQBulkActions({
  bulkEditMode,
  selectedFaqs,
  totalFaqs,
  onToggleBulkEdit,
  onBulkAction,
  onToggleSelectAll,
}: FAQBulkActionsProps) {
  const t = useTranslations("ext");
  if (!bulkEditMode) {
    return (
      <Button variant="outline" onClick={onToggleBulkEdit}>
        <CheckSquare className="mr-2 h-4 w-4" />
        {t("bulk_edit")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 border rounded-md px-2 py-1">
        <Checkbox
          checked={selectedFaqs.length === totalFaqs && totalFaqs > 0}
          onCheckedChange={onToggleSelectAll}
        />
        <span className="text-sm">
          {selectedFaqs.length}
          {t("of")}
          {totalFaqs}
          {t("selected")}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={selectedFaqs.length === 0}>
            {t("Actions")}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onBulkAction("activate")}>
            <Power className="mr-2 h-4 w-4" />
            <span>{t("Activate")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onBulkAction("deactivate")}>
            <PowerOff className="mr-2 h-4 w-4" />
            <span>{t("Deactivate")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onBulkAction("delete")}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>{t("Delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" onClick={onToggleBulkEdit}>
        {t("Cancel")}
      </Button>
    </div>
  );
}
