"use client";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, PanelRightClose } from "lucide-react";
import { useTranslations } from "next-intl";

interface PanelHeaderProps {
  elementType: string;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function PanelHeader({
  elementType,
  onClose,
  onDuplicate,
  onDelete,
}: PanelHeaderProps) {
  const t = useTranslations("dashboard");
  return (
    <div className="flex items-center justify-between p-3 border-b dark:border-zinc-800">
      <h3 className="font-medium text-sm capitalize dark:text-zinc-300">
        {elementType}
        {t("Settings")}
      </h3>
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDuplicate}
          className="h-6 w-6 p-0"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 ml-1"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
