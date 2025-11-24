"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
interface ChangePageDialogProps {
  currentPage: PageLink;
  availablePages: PageLink[];
  faqCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newPagePath: string) => void;
  isSubmitting?: boolean;
}
export function ChangePageDialog({
  currentPage,
  availablePages,
  faqCount,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: ChangePageDialogProps) {
  const [selectedPagePath, setSelectedPagePath] = useState<string>("");

  // Filter out the current page from available options
  const otherPages = availablePages.filter(
    (page) => page.path !== currentPage.path
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setSelectedPagePath("");
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move FAQs to Another Page</DialogTitle>
          <DialogDescription>
            Move all {faqCount} FAQs from <strong>{currentPage.name}</strong> to
            another page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="page" className="text-right">
              Destination
            </Label>
            <Select
              value={selectedPagePath}
              onValueChange={setSelectedPagePath}
              disabled={isSubmitting}
            >
              <SelectTrigger id="page" className="col-span-3">
                <SelectValue placeholder="Select a page" />
              </SelectTrigger>
              <SelectContent>
                {otherPages.map((page) => {
                  return (
                    <SelectItem key={page.path} value={page.path}>
                      {page.name} ({page.path})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selectedPagePath)}
            disabled={!selectedPagePath || isSubmitting}
          >
            {isSubmitting ? "Moving..." : "Move FAQs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
