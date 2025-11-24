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
interface OptionsFieldsProps {
  field: KycField;
  onUpdate: (field: KycField) => void;
}
export function OptionsFields({ field, onUpdate }: OptionsFieldsProps) {
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
        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <Info className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
          Options Not Available
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-[250px]">
          Options are only available for Select, Radio, and Checkbox field
          types.
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
        label: "Option 1",
      },
      {
        value: "option2",
        label: "Option 2",
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
      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            Field Options
          </h3>
          <Badge
            variant="outline"
            className="text-xs bg-gray-100 text-gray-600 border-gray-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-normal"
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
                className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block"
              >
                Option Label
              </Label>
              <Input
                id="new-option-label"
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="Display text"
                className="h-8 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
              />
            </div>
            <div>
              <Label
                htmlFor="new-option-value"
                className="text-xs text-gray-500 dark:text-zinc-400 mb-1 block"
              >
                Option Value
              </Label>
              <Input
                id="new-option-value"
                value={newOptionValue}
                onChange={(e) => setNewOptionValue(e.target.value)}
                placeholder="Stored value"
                className="h-8 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            disabled={!newOptionLabel || !newOptionValue}
            className="w-full bg-white border-gray-300 hover:bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-300"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Option
          </Button>

          {validationError && (
            <Alert
              variant="destructive"
              className="py-2 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertTitle className="text-xs ml-2 text-red-800 dark:text-red-300">
                {validationError}
              </AlertTitle>
            </Alert>
          )}
        </div>

        {/* Quick preset options */}
        <div className="mb-4">
          <Label className="text-xs text-gray-500 dark:text-zinc-400 mb-2 block">
            Quick Presets
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
              className="text-xs bg-white border-gray-300 hover:bg-gray-50 text-gray-700 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-zinc-300"
            >
              <Globe className="h-3 w-3 mr-1" />
              Load Countries
            </Button>
          </div>
        </div>

        <Separator className="bg-gray-200 dark:bg-zinc-800 my-3" />

        {/* Existing options */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {!field.options || field.options.length === 0 ? (
            <div className="text-center p-4 border rounded-md text-gray-500 border-gray-300 dark:text-zinc-400 dark:border-zinc-700">
              No options added yet. Add at least one option.
            </div>
          ) : (
            field.options.map((option, index) => {
              return (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-md group dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-zinc-400 w-12">
                        Label:
                      </span>
                      <Input
                        value={option.label}
                        onChange={(e) =>
                          handleUpdateOption(index, "label", e.target.value)
                        }
                        className="h-7 bg-gray-50 border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 dark:text-zinc-400 w-12">
                        Value:
                      </span>
                      <Input
                        value={option.value}
                        onChange={(e) =>
                          handleUpdateOption(index, "value", e.target.value)
                        }
                        className="h-7 bg-gray-50 border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
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
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="space-y-1">
            <Label
              htmlFor="field-multiple"
              className="text-gray-700 dark:text-zinc-300"
            >
              Multiple Selection
            </Label>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Allow selecting multiple options
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
