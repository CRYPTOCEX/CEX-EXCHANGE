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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const availableConditionalFields = getAvailableConditionalFields(
    allFields,
    field
  );

  if (availableConditionalFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Info className="h-5 w-5 text-subtle-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-2">
          {t("conditional_logic_not_available")}
        </h3>
        <p className="text-sm text-subtle-foreground max-w-[250px]">
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
      <div className="bg-muted p-3 rounded-md border border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("conditional_display")}
          </h3>
          <Switch
            checked={!!field.conditional}
            onCheckedChange={handleToggleConditional}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        <p className="text-xs text-subtle-foreground mb-4">
          {t("show_or_hide_other_fields")}
        </p>

        {field.conditional ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label
                htmlFor="conditional-field"
                className="text-xs text-subtle-foreground"
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
                  className="border-border-strong text-foreground focus:ring-primary bg-muted"
                >
                  <SelectValue placeholder={t("select_field")} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border-strong">
                  {availableConditionalFields.map((field) => (
                    <SelectItem
                      key={field.id}
                      value={field.id}
                      className="text-foreground focus:bg-muted"
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
                className="text-xs text-subtle-foreground"
              >
                {tCommon("operator")}
              </Label>
              <Select
                value={field.conditional.operator}
                onValueChange={(value) =>
                  handleUpdateConditional("operator", value)
                }
              >
                <SelectTrigger
                  id="conditional-operator"
                  className="border-border-strong text-foreground focus:ring-primary bg-muted"
                >
                  <SelectValue placeholder={tCommon("select_operator")} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border-strong">
                  <SelectItem
                    value="EQUALS"
                    className="text-foreground focus:bg-muted"
                  >
                    {tCommon("equals")}
                  </SelectItem>
                  <SelectItem
                    value="NOT_EQUALS"
                    className="text-foreground focus:bg-muted"
                  >
                    {t("does_not_equal")}
                  </SelectItem>
                  <SelectItem
                    value="CONTAINS"
                    className="text-foreground focus:bg-muted"
                  >
                    {tCommon("contains")}
                  </SelectItem>
                  <SelectItem
                    value="NOT_CONTAINS"
                    className="text-foreground focus:bg-muted"
                  >
                    {t("does_not_contain")}
                  </SelectItem>
                  <SelectItem
                    value="GREATER_THAN"
                    className="text-foreground focus:bg-muted"
                  >
                    {t("greater_than")}
                  </SelectItem>
                  <SelectItem
                    value="LESS_THAN"
                    className="text-foreground focus:bg-muted"
                  >
                    {t("less_than")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="conditional-value"
                className="text-xs text-subtle-foreground"
              >
                {tCommon("value")}
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
                        className="border-border-strong text-foreground focus:ring-primary bg-muted"
                      >
                        <SelectValue placeholder={t("select_value")} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border-strong">
                        {dependentField.options?.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-foreground focus:bg-muted"
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
                      className="border-border-strong text-foreground focus-visible:ring-primary bg-muted border-border-strong"
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
                      placeholder={t("enter_numeric_value")}
                      className="border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary bg-muted border-border-strong dark:placeholder:text-subtle-foreground"
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
                      placeholder={t("enter_value")}
                      className="border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary bg-muted border-border-strong dark:placeholder:text-subtle-foreground"
                    />
                  );
                }
              })()}
            </div>

            <Alert className="bg-primary/10 border-primary/30 text-primary-ink dark:bg-primary/20">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-xs ml-2">
                {t("this_field_will_is_met")}
              </AlertTitle>
            </Alert>
          </div>
        ) : (
          <div className="border rounded-md p-3 text-center bg-muted border-border-strong">
            <p className="text-sm text-subtle-foreground">
              {t("enable_conditional_logic_other_fields")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleConditional(true)}
              className="mt-2 bg-muted border-border-strong hover:bg-muted text-muted-foreground"
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
