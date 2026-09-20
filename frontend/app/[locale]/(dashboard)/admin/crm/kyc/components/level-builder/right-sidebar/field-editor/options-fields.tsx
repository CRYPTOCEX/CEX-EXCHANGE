"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Plus, Trash2, AlertCircle, Info, Globe, Upload } from "lucide-react";
import { COUNTRY_OPTIONS } from "@/utils/countries";
import { useTranslations } from "next-intl";
interface OptionsFieldsProps {
  field: KycField;
  onUpdate: (field: KycField) => void;
}
export function OptionsFields({ field, onUpdate }: OptionsFieldsProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  if (
    field.type !== "SELECT" &&
    field.type !== "RADIO" &&
    field.type !== "CHECKBOX"
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Info className="h-5 w-5 text-subtle-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-2">
          {t("options_not_available")}
        </h3>
        <p className="text-sm text-subtle-foreground max-w-[250px]">
          {t("options_are_only_available_for_select")}
        </p>
      </div>
    );
  }

  // Ensure the field has options property
  if (!field.options) {
    // Initialize options if they don't exist
    field.options = [
      {
        value: "option1",
        label: tDashboard("option") + " 1",
      },
      {
        value: "option2",
        label: tDashboard("option") + " 2",
      },
    ];
  }
  const handleAddOption = () => {
    // Validate option input
    if (!newOptionLabel.trim() || !newOptionValue.trim()) {
      setValidationError("Both label and value are required for options");
      return;
    }

    // Check for duplicate values
    if (field.options?.some((opt) => opt.value === newOptionValue.trim())) {
      setValidationError("Option value must be unique");
      return;
    }
    const newOption: KycFieldOption = {
      value: newOptionValue.trim(),
      label: newOptionLabel.trim(),
    };
    const updatedField = {
      ...field,
      options: [...(field.options || []), newOption],
    };
    onUpdate(updatedField); // Update the field in real-time

    // Reset inputs and error
    setNewOptionLabel("");
    setNewOptionValue("");
    setValidationError(null);
  };
  const handleUpdateOption = (index: number, key: string, value: string) => {
    if (!field.options) return;

    // If updating value, check for duplicates
    if (
      key === "value" &&
      field.options.some((opt, i) => i !== index && opt.value === value.trim())
    ) {
      setValidationError("Option value must be unique");
      return;
    }
    const updatedOptions = [...field.options];
    updatedOptions[index] = {
      ...updatedOptions[index],
      [key]: value,
    };
    const updatedField = {
      ...field,
      options: updatedOptions,
    };
    onUpdate(updatedField); // Update the field in real-time

    setValidationError(null);
  };
  const handleRemoveOption = (index: number) => {
    if (!field.options) return;
    const updatedOptions = [...field.options];
    updatedOptions.splice(index, 1);
    const updatedField = {
      ...field,
      options: updatedOptions,
    };
    onUpdate(updatedField); // Update the field in real-time
  };
  const handleToggleMultiple = (checked: boolean) => {
    const updatedField = {
      ...field,
      multiple: checked,
    };
    onUpdate(updatedField); // Update the field in real-time
  };
  return (
    <div className="space-y-5">
      <div className="bg-muted p-3 rounded-md border border-border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {tCommon("field_options")}
          </h3>
          <Badge
            variant="outline"
            className="text-xs bg-muted text-muted-foreground border-border-strong font-normal"
          >
            {field.options?.length || 0} options
          </Badge>
        </div>

        {/* Add new option form */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor="new-option-label"
                className="text-xs text-subtle-foreground mb-1 block"
              >
                {t("option_label")}
              </Label>
              <Input
                id="new-option-label"
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder={t("display_text")}
                className="h-8 border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary bg-muted border-border-strong dark:placeholder:text-subtle-foreground"
              />
            </div>
            <div>
              <Label
                htmlFor="new-option-value"
                className="text-xs text-subtle-foreground mb-1 block"
              >
                {t("option_value")}
              </Label>
              <Input
                id="new-option-value"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                placeholder={t("stored_value")}
                className="h-8 border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary bg-muted border-border-strong dark:placeholder:text-subtle-foreground"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            disabled={!newOptionLabel || !newOptionValue}
            className="w-full border-border-strong hover:bg-muted text-muted-foreground bg-muted"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add_option")}
          </Button>

          {validationError && (
            <Alert
              variant="destructive"
              className="py-2 bg-destructive/10 border-destructive dark:bg-destructive/30"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertTitle className="text-xs ml-2 text-destructive">
                {validationError}
              </AlertTitle>
            </Alert>
          )}
        </div>

        {/* Quick preset options */}
        <div className="mb-4">
          <Label className="text-xs text-subtle-foreground mb-2 block">
            {tCommon("quick_presets")}
          </Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const updatedField = {
                  ...field,
                  options: COUNTRY_OPTIONS,
                };
                onUpdate(updatedField);
              }}
              className="text-xs border-border-strong hover:bg-muted text-muted-foreground bg-muted"
            >
              <Globe className="h-3 w-3 mr-1" />
              {t("load_countries")}
            </Button>
          </div>
        </div>

        <Separator className="bg-muted my-3" />

        {/* Existing options */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {!field.options || field.options.length === 0 ? (
            <div className="text-center p-4 border rounded-md text-subtle-foreground border-border-strong">
              {t("no_options_added_yet_add_at_least_one_option")}
            </div>
          ) : (
            field.options.map((option, index) => {
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 border p-2 rounded-md group bg-muted border-border-strong"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center">
                      <span className="text-xs text-subtle-foreground w-12">
                        {tCommon("label")}:
                      </span>
                      <Input
                        value={option.label}
                        onChange={(e) =>
                          handleUpdateOption(index, "label", e.target.value)
                        }
                        className="h-7 bg-muted border-border-strong text-foreground focus-visible:ring-primary"
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-subtle-foreground w-12">
                        {tCommon("value")}:
                      </span>
                      <Input
                        value={option.value}
                        onChange={(e) =>
                          handleUpdateOption(index, "value", e.target.value)
                        }
                        className="h-7 bg-muted border-border-strong text-foreground focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Multiple selection option for SELECT type */}
      {field.type === "SELECT" && (
        <div className="flex items-center justify-between bg-muted p-3 rounded-md border border-border">
          <div className="space-y-1">
            <Label
              htmlFor="field-multiple"
              className="text-muted-foreground"
            >
              {tCommon("multiple_selection")}
            </Label>
            <p className="text-xs text-subtle-foreground">
              {t("allow_selecting_multiple_options")}
            </p>
          </div>
          <Switch
            id="field-multiple"
            checked={field.multiple || false}
            onCheckedChange={handleToggleMultiple}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      )}
    </div>
  );
}
