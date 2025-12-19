"use client";

import React, { useCallback, useMemo, useEffect, useRef } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompoundField } from "../drawers/compound-field";
import { RegularField } from "../drawers/regular-field";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Save,
  X,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { OrbsAnimation } from "../header/design-animations";
import { useTableStore } from "../store";
import type {
  FormConfig,
  FormGroupConfig,
  FormFieldConfig,
} from "../types/table";

interface ViewFormProps {
  columns: ColumnDefinition[];
  form: any;
  permissions: any;
  data: any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  isEdit?: boolean;
  isSubmitting?: boolean;
  title: string;
  description?: string;
  formConfig?: FormConfig;
  /** When true, the hero handles the title/description display */
  hasHero?: boolean;
}

// Processed field with merged column and form config
interface ProcessedField {
  column: ColumnDefinition;
  fieldConfig?: FormFieldConfig;
}

// Processed group ready for rendering
interface ProcessedGroup {
  id?: string;
  title: string;
  icon: React.ElementType;
  fields: ProcessedField[];
  priority: number;
}

// Get column by key from columns array
function getColumnByKey(
  columns: ColumnDefinition[],
  key: string
): ColumnDefinition | undefined {
  return columns.find((col) => col.key === key);
}

// Merge field config with column definition
function mergeFieldWithColumn(
  column: ColumnDefinition,
  fieldConfig?: FormFieldConfig
): ColumnDefinition {
  if (!fieldConfig) return column;

  return {
    ...column,
    // Override with form config values if provided
    type: fieldConfig.type || column.type,
    required: fieldConfig.required ?? column.required,
    validation: fieldConfig.validation || column.validation,
    apiEndpoint: fieldConfig.apiEndpoint || column.apiEndpoint,
    options: fieldConfig.options || column.options,
    dynamicSelect: fieldConfig.dynamicSelect || column.dynamicSelect,
    condition: fieldConfig.condition ?? column.condition,
    onChange: fieldConfig.onChange || column.onChange,
    uploadDir: fieldConfig.uploadDir || column.uploadDir,
    min: fieldConfig.min ?? column.min,
    max: fieldConfig.max ?? column.max,
  };
}

// Process formConfig groups into renderable format
function processFormConfigGroups(
  formConfig: FormConfig,
  columns: ColumnDefinition[],
  isEdit: boolean,
  watchedValues: any
): ProcessedGroup[] {
  const config = isEdit ? formConfig.edit : formConfig.create;
  if (!config?.groups) return [];

  const mapped = config.groups
    .map((group): ProcessedGroup | null => {
      // Check group condition
      if (group.condition !== undefined) {
        if (typeof group.condition === "boolean" && !group.condition)
          return null;
        if (
          typeof group.condition === "function" &&
          !group.condition(watchedValues)
        )
          return null;
      }

      const processedFields: ProcessedField[] = [];

      group.fields.forEach((field) => {
        const key = typeof field === "string" ? field : field.key;
        const fieldConfig = typeof field === "string" ? undefined : field;
        const column = getColumnByKey(columns, key);

        if (!column) {
          console.warn(`Column with key "${key}" not found in columns array`);
          return;
        }

        // Check field condition
        const condition = fieldConfig?.condition ?? column.condition;
        if (condition !== undefined) {
          if (typeof condition === "boolean" && !condition) return;
          if (typeof condition === "function" && !condition(watchedValues))
            return;
          if (Array.isArray(condition)) {
            const allPass = condition.every((cond) => {
              if (typeof cond === "boolean") return cond;
              if (typeof cond === "function") return cond(watchedValues);
              return false;
            });
            if (!allPass) return;
          }
        }

        processedFields.push({
          column: mergeFieldWithColumn(column, fieldConfig),
          fieldConfig,
        });
      });

      if (processedFields.length === 0) return null;

      return {
        id: group.id,
        title: group.title,
        icon: group.icon || Settings,
        fields: processedFields,
        priority: group.priority ?? 999,
      };
    });

  return mapped
    .filter((group): group is ProcessedGroup => group !== null)
    .sort((a, b) => a.priority - b.priority);
}


// Determine if a field should span full width
function getFieldSpan(column: ColumnDefinition): string {
  const fullWidthTypes = ["image", "customFields", "textarea", "editor"];
  if (fullWidthTypes.includes(column.type)) {
    return "col-span-full";
  }
  if (column.type === "compound") {
    return "col-span-full";
  }
  return "";
}

export const ViewForm = React.memo<ViewFormProps>(
  ({
    columns,
    form,
    permissions,
    data,
    onSubmit,
    onCancel,
    isEdit = false,
    isSubmitting = false,
    title,
    description,
    formConfig,
    hasHero = false,
  }) => {
    const t = useTranslations("common");
  const tComponentsBlocks = useTranslations("components_blocks");
    const formRef = useRef<HTMLFormElement>(null);

    // Get design config from store for consistent colors
    const designConfig = useTableStore((state) => state.designConfig);
    const setFormState = useTableStore((state) => state.setFormState);
    const resetFormState = useTableStore((state) => state.resetFormState);

    // Determine colors - use design config if available, otherwise fallback
    const primaryColor = designConfig?.primaryColor || (isEdit ? "amber" : "emerald");
    const secondaryColor = designConfig?.secondaryColor || (isEdit ? "orange" : "cyan");

    // Title and description are already translated by create-view/edit-view
    // Just use them directly
    const displayFormTitle = title || "";
    const displayFormDescription = description || "";

    const handleFormSubmit = useCallback(
      (values: any) => {
        onSubmit(values);
      },
      [onSubmit]
    );

    // Trigger form submit programmatically
    const triggerSubmit = useCallback(() => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }, []);

    // Register form state with store for hero integration
    useEffect(() => {
      if (hasHero) {
        setFormState({
          isSubmitting,
          isDirty: form.formState.isDirty,
          onSubmit: triggerSubmit,
          onCancel,
        });
      }

      return () => {
        if (hasHero) {
          resetFormState();
        }
      };
    }, [hasHero, isSubmitting, form.formState.isDirty, triggerSubmit, onCancel, setFormState, resetFormState]);

    const watchedValues = form.watch();

    // Process groups from formConfig
    const fieldGroups = useMemo(() => {
      if (!formConfig) return [];
      return processFormConfigGroups(
        formConfig,
        columns,
        isEdit,
        watchedValues
      );
    }, [formConfig, columns, isEdit, watchedValues]);

    // Flatten all fields for counting and empty state check
    const allFields = useMemo(
      () => fieldGroups.flatMap((g) => g.fields),
      [fieldGroups]
    );

    // Check if form has errors
    const hasErrors = Object.keys(form.formState.errors).length > 0;

    return (
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(
            (values: any) => handleFormSubmit(values),
            (errors: any) => console.log("Validation errors:", errors)
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: hasHero ? 30 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={hasHero
              ? { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.3, ease: "easeOut" }
            }
            className={cn("flex flex-col", !hasHero && "min-h-screen")}
          >
            {/* Sticky Header with animations - Only show when NOT using hero */}
            {!hasHero && (
              <div className="sticky top-0 z-50 -mx-4 md:-mx-6 lg:-mx-8 border-b overflow-hidden mt-16">
                {/* Solid background layer */}
                <div className="absolute inset-0 bg-background dark:bg-zinc-950" />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-muted/30 to-transparent dark:via-zinc-900/50" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <OrbsAnimation
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    intensity={15}
                  />
                </div>

                {/* Header content */}
                <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between py-4">
                    {/* Left side - Title and description */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold tracking-tight truncate">
                          {displayFormTitle}
                        </h2>
                        {displayFormDescription && (
                          <p className="text-sm text-muted-foreground truncate hidden sm:block">
                            {displayFormDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side - Unsaved indicator and Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {form.formState.isDirty && (
                        <span className="hidden sm:flex items-center gap-1.5 text-xs text-warning shrink-0 px-2 py-1 rounded-md bg-warning/10 border border-warning/20">
                          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                          {t("unsaved_changes")}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                      >
                        <X className="h-4 w-4 mr-1.5" />
                        {t("cancel")}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          isSubmitting ||
                          (isEdit ? !permissions.edit : !permissions.create)
                        }
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            {t("saving")}...
                          </>
                        ) : (
                          <>
                            <Save className="mr-1.5 h-4 w-4" />
                            {isEdit ? t("save_changes") : t("create")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No floating action bar for hero mode - buttons are in the hero */}

            {/* Form Fields - With container */}
            <div className="flex-1">
              <div className={cn(
                "py-6 space-y-6",
                !hasHero && "container mx-auto px-4 sm:px-6 lg:px-8"
              )}>
                {/* Error Summary */}
                <AnimatePresence>
                  {hasErrors && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
                    >
                      <p className="text-sm font-medium text-destructive">
                        {tComponentsBlocks("please_fix_the_following_errors")}:
                      </p>
                      <ul className="mt-2 text-sm text-destructive/90 list-disc list-inside">
                        {Object.entries(form.formState.errors).map(
                          ([key, error]: [string, any]) => (
                            <li key={key}>
                              {error?.message || `${key} is invalid`}
                            </li>
                          )
                        )}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Smart Layout: Use grouped sections if multiple groups, otherwise flat grid */}
                {fieldGroups.length > 1 ? (
                  // Grouped layout for complex forms
                  <div className="space-y-6">
                    {fieldGroups.map((group, groupIndex) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groupIndex * 0.1 }}
                      >
                        <Card className="overflow-hidden">
                          <CardHeader className="bg-muted/30 py-3 px-4">
                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                              <group.icon className="h-4 w-4 text-muted-foreground" />
                              {group.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                              {group.fields.map(({ column }) => {
                                const spanClass = getFieldSpan(column);
                                return (
                                  <div
                                    key={column.key}
                                    className={cn("w-full", spanClass)}
                                  >
                                    {column.type === "compound" ? (
                                      <CompoundField
                                        column={column}
                                        form={form}
                                        permissions={permissions}
                                        data={data}
                                      />
                                    ) : (
                                      <RegularField
                                        column={column}
                                        form={form}
                                        permissions={permissions}
                                        data={data}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : fieldGroups.length === 1 ? (
                  // Single group - flat grid layout without card wrapper
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {fieldGroups[0].fields.map(({ column }) => {
                      const spanClass = getFieldSpan(column);
                      return (
                        <motion.div
                          key={column.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("w-full", spanClass)}
                        >
                          {column.type === "compound" ? (
                            <CompoundField
                              column={column}
                              form={form}
                              permissions={permissions}
                              data={data}
                            />
                          ) : (
                            <RegularField
                              column={column}
                              form={form}
                              permissions={permissions}
                              data={data}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Empty state */}
                {allFields.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">
                      {tComponentsBlocks("no_fields_available")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tComponentsBlocks("no_editable_fields_for_this_item")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </form>
      </Form>
    );
  }
);

ViewForm.displayName = "ViewForm";
