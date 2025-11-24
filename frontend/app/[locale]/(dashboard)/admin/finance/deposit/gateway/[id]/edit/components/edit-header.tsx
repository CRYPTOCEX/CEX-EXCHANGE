import { useTranslations } from "next-intl";
import { ArrowLeft, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EditHeaderProps {
  gatewayId: string;
  gatewayName: string;
  isLoading?: boolean;
  hasChanges?: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditHeader({
  gatewayId,
  gatewayName,
  isLoading = false,
  hasChanges = false,
  onSave,
  onCancel,
}: EditHeaderProps) {
  const t = useTranslations("admin");

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("edit_payment_gateway")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("gateway_id")}: {gatewayId}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              {t("unsaved_changes")}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            {t("Cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isLoading || !hasChanges}
          >
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? t("Saving") : t("save_changes")}
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-medium">{gatewayName}</h2>
      </div>
    </div>
  );
}
