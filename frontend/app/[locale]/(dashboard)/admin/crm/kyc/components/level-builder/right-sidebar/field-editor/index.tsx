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
  const t = useTranslations("dashboard");
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
    <TooltipProvider>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 bg-gray-50 border border-gray-200 p-0.5 rounded-md dark:bg-zinc-900 dark:border-zinc-800">
            <TabsTrigger
              value="basic"
              className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 hover:text-gray-800 rounded-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-white dark:hover:text-zinc-300"
            >
              {t("Basic")}
            </TabsTrigger>
            <TabsTrigger
              value="options"
              className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 hover:text-gray-800 rounded-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-white dark:hover:text-zinc-300"
            >
              {t("Options")}
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 hover:text-gray-800 rounded-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-white dark:hover:text-zinc-300"
            >
              {t("Validation")}
            </TabsTrigger>
            <TabsTrigger
              value="conditional"
              className="text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 hover:text-gray-800 rounded-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-white dark:hover:text-zinc-300"
            >
              {t("Logic")}
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
    </TooltipProvider>
  );
}
