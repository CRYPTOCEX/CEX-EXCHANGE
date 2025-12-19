"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ViewForm } from "./view-form";
import { useTableStore } from "../store";
import {
  generateSchema,
  processFormValues,
  getDefaultValues,
} from "../utils/drawer";
import { handleSubmit as handleSubmitAction } from "../utils/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import type { FormConfig } from "../types/table";

interface CreateViewProps {
  columns: ColumnDefinition[];
  title: string;
  formConfig?: FormConfig;
  /** When true, the hero handles the title/description display */
  hasHero?: boolean;
}

export function CreateView({ columns, title, formConfig, hasHero = false }: CreateViewProps) {
  const t = useTranslations("common");
  const tComponentsBlocks = useTranslations("components_blocks");
  const apiEndpoint = useTableStore((state) => state.apiEndpoint);
  const permissions = useTableStore((state) => state.permissions);
  const goToOverview = useTableStore((state) => state.goToOverview);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Build the schema & default values from columns and formConfig
  const schema = useMemo(
    () => (columns ? generateSchema(columns, formConfig, false) : z.object({})),
    [columns, formConfig]
  );
  const defaultValues = useMemo(
    () => (columns ? getDefaultValues(columns, formConfig, false) : {}),
    [columns, formConfig]
  );

  // Initialize react-hook-form
  const form = useForm({
    // @ts-ignore - Complex Zod type inference causing build issues
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Reset form when view is mounted
  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleCancel = useCallback(() => {
    if (form.formState.isDirty) {
      setShowConfirmDialog(true);
    } else {
      goToOverview();
    }
  }, [form.formState.isDirty, goToOverview]);

  const confirmCancel = useCallback(() => {
    setShowConfirmDialog(false);
    form.reset(defaultValues);
    goToOverview();
  }, [form, defaultValues, goToOverview]);

  // Our main onSubmit handler
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        setIsSubmitting(true);
        const processedValues = columns
          ? processFormValues(values, columns)
          : values;

        const { error, validationErrors } = await handleSubmitAction({
          apiEndpoint,
          id: undefined,
          data: processedValues,
          isEdit: false,
          columns,
        });

        if (error) {
          // General (non-field) error - could show toast here
          console.error("Submit error:", error);
        } else if (validationErrors) {
          // For each field's error, set it in React Hook Form
          Object.entries(validationErrors).forEach(([fieldName, errorObj]) => {
            const errorMessage =
              typeof errorObj === "string" ? errorObj : (errorObj as any).message;
            form.setError(fieldName, {
              type: "server",
              message: errorMessage || "Invalid input",
            });
          });
        } else {
          // Success - go back to overview and refresh data
          form.reset(defaultValues);
          goToOverview();
          useTableStore.getState().fetchData();
        }
      } catch (error) {
        console.error("Error in handleSubmit:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [columns, apiEndpoint, form, defaultValues, goToOverview]
  );

  // Use title/description from formConfig.create if available, otherwise build dynamically
  // formConfig titles are already human-readable from useFormConfig() hooks
  const configTitle = formConfig?.create?.title;
  const configDescription = formConfig?.create?.description;

  const viewTitle = configTitle || `${t("create")} ${title}`;
  const viewDescription = configDescription || `${t("add")} ${t("new").toLowerCase()} ${title.toLowerCase()}`;

  return (
    <>
      <ViewForm
        columns={columns}
        form={form}
        permissions={permissions}
        data={null}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isEdit={false}
        isSubmitting={isSubmitting}
        title={viewTitle}
        description={viewDescription}
        formConfig={formConfig}
        hasHero={hasHero}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_unsaved_changes")}.{" "}
              {tComponentsBlocks("are_you_sure_you_want_to_close_this_form")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              {t("close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
