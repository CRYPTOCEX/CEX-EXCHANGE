"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasicFields } from "./basic-fields";
import { OptionsFields } from "./options-fields";
import { ValidationFields } from "./validation-fields";
import { ConditionalFields } from "./conditional-fields";
import { IdentityFields } from "./identity-fields";
import { useTranslations } from "next-intl";

interface FieldEditorProps {
  field: KycField;
  onUpdate: (field: KycField) => void;
  onCancel?: () => void;
  allFields: KycField[];
}

export function FieldEditor({
  field,
  onUpdate,
  onCancel,
  allFields,
}: FieldEditorProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [editedField, setEditedField] = useState<KycField>(field);
  const [activeTab, setActiveTab] = useState("basic");

  // Update the edited field when the input field changes
  useEffect(() => {
    setEditedField(field);
  }, [field]);

  const handleUpdate = (updatedField: KycField) => {
    setEditedField(updatedField);
    onUpdate(updatedField); // Update the field in real-time
  };

  const handleBasicChange = (key: string, value: any) => {
    const updatedField = {
      ...editedField,
      [key]: value,
    };
    handleUpdate(updatedField);
  };

  // If it's an identity field, show only the identity editor without tabs
  if (field.type === "IDENTITY") {
    return (
      <div className="space-y-4">
        <IdentityFields field={editedField} onUpdate={handleUpdate} />
      </div>
    );
  }

  // For all other field types, show the tabbed interface
  return (
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 bg-muted border border-border p-0.5 rounded-md border-border">
            <TabsTrigger
              value="basic"
              className="text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground hover:text-foreground rounded-lg text-muted-foreground dark:data-[state=active]:bg-muted dark:hover:text-muted-foreground"
            >
              {tCommon("basic")}
            </TabsTrigger>
            <TabsTrigger
              value="options"
              className="text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground hover:text-foreground rounded-lg text-muted-foreground dark:data-[state=active]:bg-muted dark:hover:text-muted-foreground"
            >
              {t("options")}
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className="text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground hover:text-foreground rounded-lg text-muted-foreground dark:data-[state=active]:bg-muted dark:hover:text-muted-foreground"
            >
              {t("validation")}
            </TabsTrigger>
            <TabsTrigger
              value="conditional"
              className="text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground hover:text-foreground rounded-lg text-muted-foreground dark:data-[state=active]:bg-muted dark:hover:text-muted-foreground"
            >
              {t("logic")}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="basic" className="mt-0">
              <BasicFields field={editedField} onUpdate={handleBasicChange} />
            </TabsContent>

            <TabsContent value="options" className="mt-0">
              <OptionsFields field={editedField} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="validation" className="mt-0">
              <ValidationFields field={editedField} onUpdate={handleUpdate} />
            </TabsContent>

            <TabsContent value="conditional" className="mt-0">
              <ConditionalFields
                field={editedField}
                allFields={allFields}
                onUpdate={handleUpdate}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
  );
}
