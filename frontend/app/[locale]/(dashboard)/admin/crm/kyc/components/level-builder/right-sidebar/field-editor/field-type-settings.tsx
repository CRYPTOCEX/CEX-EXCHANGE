"use client";

import { Switch } from "@/components/ui/switch";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface FieldTypeSettingsProps {
  field: KycField;
  onUpdate: (key: string, value: any) => void;
}

export function FieldTypeSettings({ field, onUpdate }: FieldTypeSettingsProps) {
  const t = useTranslations("dashboard");
  switch (field.type) {
    case "TEXTAREA": {
      return (
        <div className="space-y-2">
          <Label
            htmlFor="field-rows"
            className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
          >
            {t("Rows")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {t("initial_height_of_the_textarea")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="field-rows"
            type="number"
            min="2"
            value={field.rows || "3"}
            onChange={(e) =>
              onUpdate(
                "rows",
                e.target.value ? Number.parseInt(e.target.value) : 3
              )
            }
            className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
          />
        </div>
      );
    }

    case "NUMBER": {
      return (
        <div className="space-y-2">
          <Label
            htmlFor="field-step"
            className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
          >
            {t("Step")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t("increment_decrement_amount")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="field-step"
            type="number"
            min="0.01"
            step="0.01"
            value={field.step || "1"}
            onChange={(e) =>
              onUpdate(
                "step",
                e.target.value ? Number.parseFloat(e.target.value) : 1
              )
            }
            className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
          />
        </div>
      );
    }

    case "DATE": {
      return (
        <div className="space-y-2">
          <Label
            htmlFor="field-format"
            className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
          >
            {t("date_format")}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {t("how_the_date_should_be_displayed")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Select
            value={field.format || "yyyy-MM-dd"}
            onValueChange={(value) => onUpdate("format", value)}
          >
            <SelectTrigger
              id="field-format"
              className="bg-white border-gray-300 text-gray-900 focus:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
            >
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-700">
              <SelectItem
                value="yyyy-MM-dd"
                className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
              >
                {t("yyyy-MM-dd")}
              </SelectItem>
              <SelectItem
                value="MM/dd/yyyy"
                className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
              >
                {t("MM_dd_yyyy")}
              </SelectItem>
              <SelectItem
                value="dd/MM/yyyy"
                className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
              >
                {t("dd_MM_yyyy")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    case "FILE": {
      return (
        <>
          <div className="space-y-2">
            <Label
              htmlFor="field-accept"
              className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
            >
              {t("accepted_file_types")}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {t("mime_types_or_file_extensions")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="field-accept"
              value={field.accept || ""}
              onChange={(e) => onUpdate("accept", e.target.value || undefined)}
              placeholder="e.g. image/*,application/pdf"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
            />
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              {t("comma-separated_list_of_file_extensions")}
            </p>
          </div>
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 mt-4">
            <div className="space-y-1">
              <Label
                htmlFor="field-multiple"
                className="text-gray-700 dark:text-zinc-300"
              >
                {t("multiple_files")}
              </Label>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {t("allow_uploading_multiple_files")}
              </p>
            </div>
            <Switch
              id="field-multiple"
              checked={field.multiple || false}
              onCheckedChange={(checked) => onUpdate("multiple", checked)}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </>
      );
    }

    default:
      return null;
  }
}
