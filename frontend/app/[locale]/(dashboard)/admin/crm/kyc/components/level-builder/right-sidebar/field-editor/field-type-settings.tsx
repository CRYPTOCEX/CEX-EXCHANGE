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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface FieldTypeSettingsProps {
  field: KycField;
  onUpdate: (key: string, value: any) => void;
}

export function FieldTypeSettings({ field, onUpdate }: FieldTypeSettingsProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  switch (field.type) {
    case "TEXTAREA": {
      return (
        <div className="space-y-2">
          <Label
            htmlFor="field-rows"
            className="text-muted-foreground flex items-center gap-1"
          >
            {tCommon("rows")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-subtle-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {t("initial_height_of_the_textarea")}
                  </p>
                </TooltipContent>
              </Tooltip>
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
            className="bg-card border-border-strong text-foreground focus-visible:ring-primary border-border-strong"
          />
        </div>
      );
    }

    case "NUMBER": {
      return (
        <div className="space-y-2">
          <Label
            htmlFor="field-step"
            className="text-muted-foreground flex items-center gap-1"
          >
            {tCommon("step")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-subtle-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t("increment_decrement_amount")}</p>
                </TooltipContent>
              </Tooltip>
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
            className="bg-card border-border-strong text-foreground focus-visible:ring-primary border-border-strong"
          />
        </div>
      );
    }

    case "DATE": {
      return (
        <div className="space-y-2">
          <Label
            htmlFor="field-format"
            className="text-muted-foreground flex items-center gap-1"
          >
            {t("date_format")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-subtle-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {t("how_the_date_should_be_displayed")}
                  </p>
                </TooltipContent>
              </Tooltip>
          </Label>
          <Select
            value={field.format || "yyyy-MM-dd"}
            onValueChange={(value) => onUpdate("format", value)}
          >
            <SelectTrigger
              id="field-format"
              className="bg-card border-border-strong text-foreground focus:ring-primary"
            >
              <SelectValue placeholder={t("select_format")} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border-strong">
              <SelectItem
                value="yyyy-MM-dd"
                className="text-foreground focus:bg-muted"
              >
                yyyy-MM-dd
              </SelectItem>
              <SelectItem
                value="MM/dd/yyyy"
                className="text-foreground focus:bg-muted"
              >
                {t("mm_dd_yyyy")}
              </SelectItem>
              <SelectItem
                value="dd/MM/yyyy"
                className="text-foreground focus:bg-muted"
              >
                {t("dd_mm_yyyy")}
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
              className="text-muted-foreground flex items-center gap-1"
            >
              {t("accepted_file_types")}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-subtle-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {t("mime_types_or_file_extensions")}
                    </p>
                  </TooltipContent>
                </Tooltip>
            </Label>
            <Input
              id="field-accept"
              value={field.accept || ""}
              onChange={(e) => onUpdate("accept", e.target.value || undefined)}
              placeholder={t("e_g_image_application_pdf")}
              className="bg-card border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary border-border-strong dark:placeholder:text-subtle-foreground"
            />
            <p className="text-xs text-subtle-foreground">
              {t("comma_separated_list_of_file_extensions")}
            </p>
          </div>
          <div className="flex items-center justify-between bg-muted p-3 rounded-md border border-border mt-4">
            <div className="space-y-1">
              <Label
                htmlFor="field-multiple"
                className="text-muted-foreground"
              >
                {t("multiple_files")}
              </Label>
              <p className="text-xs text-subtle-foreground">
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
