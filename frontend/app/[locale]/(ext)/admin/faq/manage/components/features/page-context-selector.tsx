"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
interface PageContextSelectorProps {
  pages: PageLink[];
  currentPageId: string | null;
  onPageChange: (pageId: string | null) => void;
}
export function PageContextSelector({
  pages,
  currentPageId,
  onPageChange,
}: PageContextSelectorProps) {
  const currentPage = currentPageId
    ? pages.find((page) => page.id === currentPageId)
    : null;
  return (
    <div className="flex items-center gap-2">
      {currentPage && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Ordering for: {currentPage.name}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 rounded-full p-0 ml-1"
            onClick={() => onPageChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      <Select
        value={currentPageId || "global"}
        onValueChange={(value) =>
          onPageChange(value === "global" ? null : value)
        }
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select page for ordering" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="global">Global Ordering</SelectItem>
          {pages.map((page) => {
            return (
              <SelectItem key={page.id} value={page.id}>
                {page.name} ({page.group})
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
