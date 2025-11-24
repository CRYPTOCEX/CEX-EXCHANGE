"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

interface PageActionsMenuProps {
  page: PageLink;
  faqCount: number;
  onDeletePage: (page: PageLink) => void;
  onEnableFaqs: (page: PageLink) => void;
  onDisableFaqs: (page: PageLink) => void;
}

export function PageActionsMenu({
  page,
  faqCount,
  onDeletePage,
  onEnableFaqs,
  onDisableFaqs,
}: PageActionsMenuProps) {
  const t = useTranslations("ext");
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onEnableFaqs(page)}
          disabled={faqCount === 0}
          className="text-green-600"
        >
          <Eye className="mr-2 h-4 w-4" />
          <span>{t("enable_all_faqs")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDisableFaqs(page)}
          disabled={faqCount === 0}
          className="text-amber-600"
        >
          <EyeOff className="mr-2 h-4 w-4" />
          <span>{t("disable_all_faqs")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDeletePage(page)}
          disabled={faqCount === 0}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{t("delete_page_with_faqs")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
