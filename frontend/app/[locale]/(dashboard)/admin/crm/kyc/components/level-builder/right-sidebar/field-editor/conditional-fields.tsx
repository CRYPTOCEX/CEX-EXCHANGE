"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Pencil } from "lucide-react";
import { getAvailableConditionalFields } from "./utils";
import { useTranslations } from "next-intl";

interface ConditionalFieldsProps {
  field: KycField;
  allFields: KycField[];
  onUpdate: (field: KycField) => void;
}

export function ConditionalFields({
  field,
  allFields,
  onUpdate,
}: ConditionalFieldsProps) {
  const t = useTranslations("dashboard");
  const availableConditionalFields = getAvailableConditionalFields(
    allFields,
    field
  );

  if (availableConditionalFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
          <Info className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
          {t("conditional_logic_not_available")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-[250px]">
          {t("conditional_logic_requires_the_form")}.
        </p>
      </div>
    );
  }

  const handleToggleConditional = (enabled: boolean) => {
    let updatedField: KycField;

    if (enabled) {
      if (availableConditionalFields.length > 0) {
        const conditionalField = availableConditionalFields[0];
        let conditionalValue = "";

        if (
          conditionalField.type === "SELECT" ||
          conditionalField.type === "RADIO" ||
          conditionalField.type === "CHECKBOX"
        ) {
          const options = conditionalField.options;
          if (options && options.length > 0) {
            conditionalValue = options[0].value;
          }
        }

        updatedField = {
          ...field,
          conditional: {
            field: conditionalField.id,
            operator: "EQUALS",
            value: conditionalValue,
          },
        };
      } else {
        return; // No fields available for conditional logic
      }
    } else {
      const { conditional, ...rest } = field;
      updatedField = rest as KycField;
    }

    onUpdate(updatedField);
  };

  const handleUpdateConditional = (key: string, value: any) => {
    if (!field.conditional) return;

    const updatedField = {
      ...field,
      conditional: {
        ...field.conditional,
        [key]: value,
      },
    };

    onUpdate(updatedField);
  };

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            {t("conditional_display")}
          </h3>
          <Switch
            checked={!!field.conditional}
            onCheckedChange={handleToggleConditional}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4">
          {t("show_or_hide_other_fields")}
        </p>

        {field.conditional ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label
                htmlFor="conditional-field"
                className="text-xs text-gray-500 dark:text-zinc-400"
              >
                {t("show_this_field_if")}
              </Label>
              <Select
                value={field.conditional.field}
                onValueChange={(value) =>
                  handleUpdateConditional("field", value)
                }
              >
                <SelectTrigger
                  id="conditional-field"
                  className="bg-white border-gray-300 text-gray-900 focus:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-700">
                  {availableConditionalFields.map((field) => (
                    <SelectItem
                      key={field.id}
                      value={field.id}
                      className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                    >
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="conditional-operator"
                className="text-xs text-gray-500 dark:text-zinc-400"
              >
                {t("Operator")}
              </Label>
              <Select
                value={field.conditional.operator}
                onValueChange={(value) =>
                  handleUpdateConditional("operator", value)
                }
              >
                <SelectTrigger
                  id="conditional-operator"
                  className="bg-white border-gray-300 text-gray-900 focus:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-700">
                  <SelectItem
                    value="EQUALS"
                    className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                  >
                    {t("Equals")}
                  </SelectItem>
                  <SelectItem
                    value="NOT_EQUALS"
                    className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                  >
                    {t("does_not_equal")}
                  </SelectItem>
                  <SelectItem
                    value="CONTAINS"
                    className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                  >
                    {t("Contains")}
                  </SelectItem>
                  <SelectItem
                    value="NOT_CONTAINS"
                    className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                  >
                    {t("does_not_contain")}
                  </SelectItem>
                  <SelectItem
                    value="GREATER_THAN"
                    className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                  >
                    {t("greater_than")}
                  </SelectItem>
                  <SelectItem
                    value="LESS_THAN"
                    className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                  >
                    {t("less_than")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="conditional-value"
                className="text-xs text-gray-500 dark:text-zinc-400"
              >
                {t("Value")}
              </Label>
              {(() => {
                const dependentField = availableConditionalFields.find(
                  (f) => f.id === field.conditional?.field
                );

                if (
                  dependentField &&
                  (dependentField.type === "SELECT" ||
                    dependentField.type === "RADIO" ||
                    dependentField.type === "CHECKBOX")
                ) {
                  return (
                    <Select
                      value={field.conditional.value as string}
                      onValueChange={(value) =>
                        handleUpdateConditional("value", value)
                      }
                    >
                      <SelectTrigger
                        id="conditional-value"
                        className="bg-white border-gray-300 text-gray-900 focus:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                      >
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-700">
                        {dependentField.options?.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-gray-900 focus:bg-gray-100 dark:text-white dark:focus:bg-zinc-800"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                } else if (dependentField && dependentField.type === "DATE") {
                  return (
                    <Input
                      id="conditional-value"
                      type="date"
                      value={field.conditional.value as string}
                      onChange={(e) =>
                        handleUpdateConditional("value", e.target.value)
                      }
                      className="bg-white border-gray-300 text-gray-900 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                    />
                  );
                } else if (dependentField && dependentField.type === "NUMBER") {
                  return (
                    <Input
                      id="conditional-value"
                      type="number"
                      value={field.conditional.value as string}
                      onChange={(e) =>
                        handleUpdateConditional("value", e.target.value)
                      }
                      placeholder="Enter numeric value"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
                    />
                  );
                } else {
                  return (
                    <Input
                      id="conditional-value"
                      value={field.conditional.value as string}
                      onChange={(e) =>
                        handleUpdateConditional("value", e.target.value)
                      }
                      placeholder="Enter value"
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
                    />
                  );
                }
              })()}
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs ml-2">
                {t("this_field_will_is_met")}
              </AlertTitle>
            </Alert>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-md p-3 text-center dark:bg-zinc-800 dark:border-zinc-700">
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {t("enable_conditional_logic_other_fields")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleConditional(true)}
              className="mt-2 bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:border-zinc-600 dark:hover:bg-zinc-600 dark:text-zinc-300"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {t("configure_logic")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
