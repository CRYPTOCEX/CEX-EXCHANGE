"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SettingsField } from "./field";
import { FieldDefinition } from "@/config/settings";
import { AffiliateLevels } from "./affiliate-levels";
import { useTranslations } from "next-intl";

interface SettingsTabProps {
  tabId: string;
  tabLabel: string;
  fields: FieldDefinition[];
  draftSettings: Record<string, any>;
  onFieldChange: (key: string, value: string | File | null) => void;
}

interface SettingsGroupProps {
  subcategory: string;
  fields: FieldDefinition[];
  formValues: Record<string, any>;
  handleChange: (key: string, value: string | File | null) => void;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({
  subcategory,
  fields,
  formValues,
  handleChange,
}) => {
  const displayedFields = fields.filter(
    (field) => !field.showIf || field.showIf(formValues)
  );

  // Check if this is a logos category to apply special grid layout
  const isLogosCategory = fields.some(field => field.category === "logos");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{subcategory}</h3>
      <Separator />
      <div className={isLogosCategory ? 
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : 
        "space-y-6"
      }>
        {displayedFields.map((field) => (
          <SettingsField
            key={field.key}
            field={field}
            value={formValues[field.key]}
            onChange={handleChange}
          />
        ))}

        {subcategory === "Affiliate" && formValues.mlmSystem === "BINARY" && (
          <AffiliateLevels
            levelsCount={Number(formValues.binaryLevels) || 0}
            levelPrefix="binaryLevel"
            title="Binary Levels"
            formValues={formValues}
            handleChange={handleChange}
          />
        )}

        {subcategory === "Affiliate" && formValues.mlmSystem === "UNILEVEL" && (
          <AffiliateLevels
            levelsCount={Number(formValues.unilevelLevels) || 0}
            levelPrefix="unilevelLevel"
            title="Unilevel Levels"
            formValues={formValues}
            handleChange={handleChange}
          />
        )}
      </div>
    </div>
  );
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tabId,
  tabLabel,
  fields,
  draftSettings,
  onFieldChange,
}) => {
  const t = useTranslations("dashboard");
  const formValues = draftSettings;
  


  const groupedFields = useMemo(() => {
    return fields.reduce<Record<string, FieldDefinition[]>>((acc, field) => {
      const subcategory = field.subcategory || "General";
      if (!acc[subcategory]) {
        acc[subcategory] = [];
      }
      acc[subcategory].push(field);
      return acc;
    }, {});
  }, [fields]);

  const handleChange = (key: string, value: string | File | null) => {
    onFieldChange(key, value);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-zinc-50 dark:bg-zinc-900 rounded-t-lg mb-4 flex-shrink-0">
        <CardTitle>
          {tabLabel}{" "}
          {t("Settings")}
        </CardTitle>
        <CardDescription>
          {t("Manage")}{" "}
          {tabLabel.toLowerCase()}{" "}
          {t("settings_for_your_application")}.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-6">
        <ScrollArea className="h-full overflow-auto py-1">
          <div className="space-y-8 pr-4">
            {Object.entries(groupedFields).map(([subcategory, subFields]) => (
              <SettingsGroup
                key={subcategory}
                subcategory={subcategory}
                fields={subFields}
                formValues={formValues}
                handleChange={handleChange}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
