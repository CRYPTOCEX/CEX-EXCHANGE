"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { FieldTypeSettings } from "./field-type-settings";
import { useTranslations } from "next-intl";

interface BasicFieldsProps {
  field: KycField;
  onUpdate: (key: string, value: any) => void;
}

export function BasicFields({ field, onUpdate }: BasicFieldsProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const handleBasicChange = (key: string, value: any) => {
    onUpdate(key, value);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="field-label"
            className="text-muted-foreground flex items-center gap-1"
          >
            {tCommon("label")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-subtle-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t("the_label_displayed_to_users")}</p>
                </TooltipContent>
              </Tooltip>
          </Label>
          <Badge
            variant="outline"
            className="text-xs bg-muted text-muted-foreground border-border-strong font-normal"
          >
            {tCommon("required")}
          </Badge>
        </div>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => handleBasicChange("label", e.target.value)}
          className="bg-card border-border-strong text-foreground focus-visible:ring-primary border-border-strong"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="field-description"
          className="text-muted-foreground flex items-center gap-1"
        >
          {tCommon("description")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-subtle-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {t("help_text_shown_below_the_field")}
                </p>
              </TooltipContent>
            </Tooltip>
        </Label>
        <Textarea
          id="field-description"
          value={field.description || ""}
          onChange={(e) => handleBasicChange("description", e.target.value)}
          placeholder={t("optional_field_description")}
          className="bg-card border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary border-border-strong dark:placeholder:text-subtle-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="field-placeholder"
          className="text-muted-foreground flex items-center gap-1"
        >
          {t("placeholder")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-subtle-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t("text_shown_when_field_is_empty")}</p>
              </TooltipContent>
            </Tooltip>
        </Label>
        <Input
          id="field-placeholder"
          value={field.placeholder || ""}
          onChange={(e) => handleBasicChange("placeholder", e.target.value)}
          placeholder={t("optional_placeholder_text")}
          className="bg-card border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary border-border-strong dark:placeholder:text-subtle-foreground"
        />
      </div>

      {/* Field-specific settings */}
      <FieldTypeSettings field={field} onUpdate={handleBasicChange} />

      <Separator className="bg-muted my-4" />

      <div className="flex items-center justify-between bg-muted p-3 rounded-md border border-border">
        <div className="space-y-1">
          <Label
            htmlFor="field-required"
            className="text-muted-foreground"
          >
            {tCommon("required_field")}
          </Label>
          <p className="text-xs text-subtle-foreground">
            {t("users_must_complete_this_field")}
          </p>
        </div>
        <Switch
          id="field-required"
          checked={field.required}
          onCheckedChange={(checked) => handleBasicChange("required", checked)}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    </div>
  );
}
