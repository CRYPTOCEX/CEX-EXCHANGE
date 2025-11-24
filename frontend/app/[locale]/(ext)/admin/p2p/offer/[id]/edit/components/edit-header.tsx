"use client";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface EditHeaderProps {
  offerId: string;
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditHeader({
  offerId,
  isLoading,
  onSave,
  onCancel,
}: EditHeaderProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" size="sm" onClick={onCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("Cancel")}
      </Button>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={isLoading}
        >
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
