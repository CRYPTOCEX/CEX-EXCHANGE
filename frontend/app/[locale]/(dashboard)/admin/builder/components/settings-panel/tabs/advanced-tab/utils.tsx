"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { RemoveButtonProps } from "./types";

export const inputClass = "h-7 text-xs";

export const RemoveButton = ({ onRemove }: RemoveButtonProps) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onRemove}
    className="h-7 w-7 text-red-500 hover:text-red-600"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
);
