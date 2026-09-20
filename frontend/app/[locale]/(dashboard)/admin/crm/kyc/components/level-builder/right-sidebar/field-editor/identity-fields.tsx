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
import { useTranslations } from "next-intl";
interface IdentityFieldsProps {
  field: any;
  onUpdate: (field: any) => void;
}
export function IdentityFields({ field, onUpdate }: IdentityFieldsProps) {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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
            className="text-muted-foreground flex items-center gap-1"
          >
            Label
            <Info className="h-3 w-3 text-subtle-foreground" />
          </Label>
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
            Description
            <Info className="h-3 w-3 text-subtle-foreground" />
          </Label>
          <Textarea
            id="field-description"
            value={field.description || ""}
            onChange={(e) => handleBasicChange("description", e.target.value)}
            placeholder={t("optional_field_description")}
            className="bg-card border-border-strong text-foreground placeholder:text-muted-foreground focus-visible:ring-primary border-border-strong dark:placeholder:text-subtle-foreground"
          />
        </div>

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
            onCheckedChange={(checked) =>
              handleBasicChange("required", checked)
            }
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>

      <Separator className="bg-muted" />

      <div>
        <h3 className="text-sm font-medium mb-2">{t("identity_document_types")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("select_which_identity_can_submit")}
        </p>

        <div className="space-y-2">
          {IDENTITY_TYPES.map((type) => {
            return (
              <Card
                key={type.value}
                className={`border ${selectedTypes.includes(type.value) ? "border-primary" : "border-border"}`}
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
                              tone="primary" appearance="soft"
                            >
                              Default
                            </Badge>
                          ) : (
                            tDashboardAdmin("set_as_default")
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
                    {type.fields.length} {t("required_document")}
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

      <Separator className="bg-muted" />

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="require-selfie" className="text-sm font-medium">
            {t("require_selfie_with_id")}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {t("require_users_to_id_document")}
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
