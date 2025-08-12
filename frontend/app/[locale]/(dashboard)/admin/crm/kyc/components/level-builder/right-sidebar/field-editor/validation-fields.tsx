"use client";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger as TooltipTriggerAlias,
  TooltipContent as TooltipContentAlias,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Info } from "lucide-react";
import { getAvailableValidationTypes } from "./utils";
import { useTranslations } from "next-intl";

interface ValidationFieldsProps {
  field: KycField;
  onUpdate: (field: KycField) => void;
}

export function ValidationFields({ field, onUpdate }: ValidationFieldsProps) {
  const t = useTranslations("dashboard");
  const availableTypes = getAvailableValidationTypes(field.type);

  if (availableTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <Info className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
          {t("validation_not_available")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-[250px]">
          {t("validation_is_not_available_for_this_field_type")}.
        </p>
      </div>
    );
  }

  const handleBasicChange = (key: string, value: any) => {
    const updatedField = {
      ...field,
      validation: {
        ...field.validation,
        [key]: value,
      },
    };
    onUpdate(updatedField);
  };

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">
          {t("validation_rules")}
        </h3>

        {/* Field-specific validation settings */}
        {field.type === "TEXT" ||
        field.type === "EMAIL" ||
        field.type === "PHONE" ||
        field.type === "TEXTAREA" ? (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="field-minLength"
                    className="text-xs text-gray-500 dark:text-zinc-400"
                  >
                    {t("minimum_length")}
                  </Label>
                  <div className="flex">
                    <Input
                      id="field-minLength"
                      type="number"
                      min="0"
                      value={field.validation?.minLength || ""}
                      onChange={(e) =>
                        handleBasicChange(
                          "minLength",
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : undefined
                        )
                      }
                      className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    />
                    <div className="bg-gray-100 text-gray-700 text-xs flex items-center px-2 rounded-r-md border border-l-0 border-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600">
                      {t("chars")}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="field-maxLength"
                    className="text-xs text-gray-500 dark:text-zinc-400"
                  >
                    {t("maximum_length")}
                  </Label>
                  <div className="flex">
                    <Input
                      id="field-maxLength"
                      type="number"
                      min="0"
                      value={field.validation?.maxLength || ""}
                      onChange={(e) =>
                        handleBasicChange(
                          "maxLength",
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : undefined
                        )
                      }
                      className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    />
                    <div className="bg-gray-100 text-gray-700 text-xs flex items-center px-2 rounded-r-md border border-l-0 border-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600">
                      {t("chars")}
                    </div>
                  </div>
                </div>
              </div>

              {field.type === "TEXT" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="field-pattern"
                    className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1"
                  >
                    {t("pattern_(regex)")}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTriggerAlias asChild>
                          <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                        </TooltipTriggerAlias>
                        <TooltipContentAlias>
                          <p className="text-xs">
                            {t("regular_expression_pattern_for_validation")}
                          </p>
                        </TooltipContentAlias>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="field-pattern"
                    value={field.validation?.pattern || ""}
                    onChange={(e) =>
                      handleBasicChange("pattern", e.target.value || undefined)
                    }
                    placeholder="e.g. ^[A-Za-z0-9]+$"
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-500">
                    {t("example_^a-za-z0-9+$_for_characters_only")}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : field.type === "NUMBER" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="field-min"
                  className="text-xs text-gray-500 dark:text-zinc-400"
                >
                  {t("minimum_value")}
                </Label>
                <Input
                  id="field-min"
                  type="number"
                  value={
                    field.validation?.min !== undefined
                      ? field.validation.min
                      : ""
                  }
                  onChange={(e) =>
                    handleBasicChange(
                      "min",
                      e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined
                    )
                  }
                  className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="field-max"
                  className="text-xs text-gray-500 dark:text-zinc-400"
                >
                  {t("maximum_value")}
                </Label>
                <Input
                  id="field-max"
                  type="number"
                  value={
                    field.validation?.max !== undefined
                      ? field.validation.max
                      : ""
                  }
                  onChange={(e) =>
                    handleBasicChange(
                      "max",
                      e.target.value
                        ? Number.parseFloat(e.target.value)
                        : undefined
                    )
                  }
                  className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
            </div>
          </>
        ) : field.type === "DATE" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="field-minDate"
                  className="text-xs text-gray-500 dark:text-zinc-400"
                >
                  {t("minimum_date")}
                </Label>
                <Input
                  id="field-minDate"
                  type="date"
                  value={field.validation?.minDate || ""}
                  onChange={(e) =>
                    handleBasicChange("minDate", e.target.value || undefined)
                  }
                  className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="field-maxDate"
                  className="text-xs text-gray-500 dark:text-zinc-400"
                >
                  {t("maximum_date")}
                </Label>
                <Input
                  id="field-maxDate"
                  type="date"
                  value={field.validation?.maxDate || ""}
                  onChange={(e) =>
                    handleBasicChange("maxDate", e.target.value || undefined)
                  }
                  className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
            </div>
          </>
        ) : field.type === "FILE" ? (
          <div className="space-y-2">
            <Label
              htmlFor="field-maxSize"
              className="text-xs text-gray-500 dark:text-zinc-400"
            >
              {t("maximum_file_size_(kb)")}
            </Label>
            <div className="flex">
              <Input
                id="field-maxSize"
                type="number"
                min="1"
                value={
                  field.validation?.maxSize
                    ? Math.floor(field.validation.maxSize / 1024)
                    : ""
                }
                onChange={(e) =>
                  handleBasicChange(
                    "maxSize",
                    e.target.value
                      ? Number.parseInt(e.target.value) * 1024
                      : undefined
                  )
                }
                className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              />
              <div className="bg-gray-100 text-gray-700 text-xs flex items-center px-2 rounded-r-md border border-l-0 border-gray-300 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600">
                {'KB'}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm">{t("validation_messages")}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1 mb-3">
          {t("error_messages_are_validation_rules")}.
        </p>

        <div className="space-y-2">
          {field.type === "TEXT" && (
            <>
              {field.validation?.minLength && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                  <span>
                    {t("must_be_at_least")}
                    {field.validation.minLength}
                    {t("characters")}
                  </span>
                </div>
              )}
              {field.validation?.maxLength && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                  <span>
                    {t("must_be_at_most")}
                    {field.validation.maxLength}
                    {t("characters")}
                  </span>
                </div>
              )}
              {field.validation?.pattern && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                  <span>
                    {t("must_match_pattern")}
                    {field.validation.pattern}
                  </span>
                </div>
              )}
            </>
          )}

          {field.type === "NUMBER" && (
            <>
              {field.validation?.min !== undefined && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                  <span>
                    {t("must_be_at_least")}
                    {field.validation.min}
                  </span>
                </div>
              )}
              {field.validation?.max !== undefined && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                  <span>
                    {t("must_be_at_most")}
                    {field.validation.max}
                  </span>
                </div>
              )}
            </>
          )}

          {field.required && (
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              <span>{t("this_field_is_required")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
