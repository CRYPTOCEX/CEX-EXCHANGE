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
  TooltipProvider,
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
  const t = useTranslations("dashboard");
  const handleBasicChange = (key: string, value: any) => {
    onUpdate(key, value);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="field-label"
            className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
          >
            {t("Label")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t("the_label_displayed_to_users")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Badge
            variant="outline"
            className="text-xs bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-normal"
          >
            {t("Required")}
          </Badge>
        </div>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => handleBasicChange("label", e.target.value)}
          className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="field-description"
          className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
        >
          {t("Description")}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {t("help_text_shown_below_the_field")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Textarea
          id="field-description"
          value={field.description || ""}
          onChange={(e) => handleBasicChange("description", e.target.value)}
          placeholder="Optional field description"
          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="field-placeholder"
          className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
        >
          {t("Placeholder")}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{t("text_shown_when_field_is_empty")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="field-placeholder"
          value={field.placeholder || ""}
          onChange={(e) => handleBasicChange("placeholder", e.target.value)}
          placeholder="Optional placeholder text"
          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
        />
      </div>

      {/* Field-specific settings */}
      <FieldTypeSettings field={field} onUpdate={handleBasicChange} />

      <Separator className="bg-gray-200 dark:bg-zinc-800 my-4" />

      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="space-y-1">
          <Label
            htmlFor="field-required"
            className="text-gray-700 dark:text-zinc-300"
          >
            {t("required_field")}
          </Label>
          <p className="text-xs text-gray-500 dark:text-zinc-500">
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
