"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileText, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { IDENTITY_TYPES } from "@/app/[locale]/(dashboard)/user/kyc/components/dynamic-form/identity-field";
interface IdentityFieldsProps {
  field: any;
  onUpdate: (field: any) => void;
}
export function IdentityFields({ field, onUpdate }: IdentityFieldsProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    field.identityTypes?.map((t: any) => t.value) ||
      IDENTITY_TYPES.map((t) => t.value)
  );
  const [defaultType, setDefaultType] = useState<string>(
    field.defaultType || IDENTITY_TYPES[0].value
  );
  const [requireSelfie, setRequireSelfie] = useState<boolean>(
    field.requireSelfie !== undefined ? field.requireSelfie : true
  );
  const handleTypeToggle = (typeValue: string) => {
    if (selectedTypes.includes(typeValue)) {
      // Don't allow removing the last type
      if (selectedTypes.length === 1) return;
      const newSelectedTypes = selectedTypes.filter((t) => t !== typeValue);
      setSelectedTypes(newSelectedTypes);

      // If the default type is being removed, set a new default
      if (defaultType === typeValue) {
        setDefaultType(newSelectedTypes[0]);
      }
      updateField(
        newSelectedTypes,
        defaultType === typeValue ? newSelectedTypes[0] : defaultType
      );
    } else {
      const newSelectedTypes = [...selectedTypes, typeValue];
      setSelectedTypes(newSelectedTypes);
      updateField(newSelectedTypes, defaultType);
    }
  };
  const handleDefaultTypeChange = (typeValue: string) => {
    setDefaultType(typeValue);
    updateField(selectedTypes, typeValue);
  };
  const handleSelfieToggle = (checked: boolean) => {
    setRequireSelfie(checked);
    onUpdate({
      ...field,
      requireSelfie: checked,
      identityTypes: getIdentityTypes(selectedTypes, checked),
      defaultType,
    });
  };
  const handleBasicChange = (key: string, value: any) => {
    onUpdate({
      ...field,
      [key]: value,
      identityTypes: getIdentityTypes(selectedTypes, requireSelfie),
      defaultType,
    });
  };
  const getIdentityTypes = (types: string[], includeSelfie: boolean) => {
    return IDENTITY_TYPES.filter((type) => types.includes(type.value)).map(
      (type) => {
        // If selfie is not required, filter out selfie fields
        const fields = includeSelfie
          ? type.fields
          : type.fields.filter((field) => !field.id.includes("selfie"));
        return {
          ...type,
          fields,
        };
      }
    );
  };
  const updateField = (types: string[], defaultTypeValue: string) => {
    onUpdate({
      ...field,
      identityTypes: getIdentityTypes(types, requireSelfie),
      defaultType: defaultTypeValue,
      requireSelfie,
    });
  };
  return (
    <div className="space-y-6">
      {/* Basic field properties */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="field-label"
            className="text-gray-700 dark:text-zinc-300 flex items-center gap-1"
          >
            Label
            <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
          </Label>
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
            Description
            <Info className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
          </Label>
          <Textarea
            id="field-description"
            value={field.description || ""}
            onChange={(e) => handleBasicChange("description", e.target.value)}
            placeholder="Optional field description"
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus-visible:ring-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-white dark:placeholder:text-zinc-500"
          />
        </div>

        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-200 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="space-y-1">
            <Label
              htmlFor="field-required"
              className="text-gray-700 dark:text-zinc-300"
            >
              Required Field
            </Label>
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Users must complete this field
            </p>
          </div>
          <Switch
            id="field-required"
            checked={field.required}
            onCheckedChange={(checked) =>
              handleBasicChange("required", checked)
            }
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <Separator className="bg-gray-200 dark:bg-zinc-800" />

      <div>
        <h3 className="text-sm font-medium mb-2">Identity Document Types</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Select which identity document types users can submit
        </p>

        <div className="space-y-2">
          {IDENTITY_TYPES.map((type) => {
            return (
              <Card
                key={type.value}
                className={`border ${selectedTypes.includes(type.value) ? "border-primary" : "border-gray-200"}`}
              >
                <CardHeader className="p-3 pb-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {type.label}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {selectedTypes.includes(type.value) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDefaultTypeChange(type.value)}
                          disabled={defaultType === type.value}
                        >
                          {defaultType === type.value ? (
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              Default
                            </Badge>
                          ) : (
                            "Set as default"
                          )}
                        </Button>
                      )}
                      <Switch
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={() => handleTypeToggle(type.value)}
                        disabled={
                          selectedTypes.length === 1 &&
                          selectedTypes.includes(type.value)
                        }
                      />
                    </div>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {type.fields.length} required document
                    {type.fields.length > 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                {selectedTypes.includes(type.value) && (
                  <CardContent className="p-3">
                    <div className="text-xs space-y-1">
                      {type.fields.map((field) => {
                        return (
                          <div
                            key={field.id}
                            className="flex items-center gap-2 text-muted-foreground"
                          >
                            <FileText className="h-3 w-3" />
                            <span>{field.label}</span>
                            {field.required && (
                              <span className="text-destructive text-[10px]">
                                *
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="bg-gray-200 dark:bg-zinc-800" />

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="require-selfie" className="text-sm font-medium">
            Require Selfie with ID
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Require users to submit a selfie holding their ID document
          </p>
        </div>
        <Switch
          id="require-selfie"
          checked={requireSelfie}
          onCheckedChange={handleSelfieToggle}
        />
      </div>
    </div>
  );
}
