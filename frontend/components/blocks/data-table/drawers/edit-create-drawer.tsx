"use client";

import React, { useCallback, useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DrawerForm } from "./drawer-form";
import { useTableStore } from "../store";
import {
  generateSchema,
  formatDataForForm,
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

interface DrawerProps {
  columns: ColumnDefinition[];
  title: string;
}

export function EditCreateDrawer({ columns, title }: DrawerProps) {
  const t = useTranslations(
    "components/blocks/data-table/drawers/edit-create-drawer"
  );
  const apiEndpoint = useTableStore((state) => state.apiEndpoint);
  const permissions = useTableStore((state) => state.permissions);
  const isCreateDrawerOpen = useTableStore((state) => state.isCreateDrawerOpen);
  const isEditDrawerOpen = useTableStore((state) => state.isEditDrawerOpen);
  const selectedRow = useTableStore((state) => state.selectedRow);

  const setCreateDrawerOpen = useTableStore(
    (state) => state.setCreateDrawerOpen
  );
  const setEditDrawerOpen = useTableStore((state) => state.setEditDrawerOpen);
  const setSelectedRow = useTableStore((state) => state.setSelectedRow);

  // Build the schema & default values from columns
  const schema = useMemo(
    () => (columns ? generateSchema(columns) : z.object({})),
    [columns]
  );
  const defaultValues = useMemo(
    () => (columns ? getDefaultValues(columns) : {}),
    [columns]
  );

  // Initialize react-hook-form
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Manage drawer open/close
  const [initialized, setInitialized] = useState(false);
  const isOpen = isCreateDrawerOpen || isEditDrawerOpen;

  useEffect(() => {
    if (isOpen && !initialized) {
      if (selectedRow) {
        // Edit mode
        const formattedData = formatDataForForm(selectedRow, columns);
        form.reset({ ...formattedData, id: selectedRow.id });
      } else {
        // Create mode
        form.reset(defaultValues);
      }
      setInitialized(true);
    }
  }, [isOpen, initialized, selectedRow, columns, defaultValues, form]);

  // Reset our internal "initialized" state when drawer closes
  useEffect(() => {
    if (!isOpen && initialized) {
      setInitialized(false);
    }
  }, [isOpen, initialized]);

  const closeDrawer = useCallback(() => {
    if (isEditDrawerOpen) {
      setEditDrawerOpen(false);
    } else {
      setCreateDrawerOpen(false);
    }
    setSelectedRow(null);
    form.reset(defaultValues);
    setInitialized(false);
  }, [
    isEditDrawerOpen,
    setEditDrawerOpen,
    setCreateDrawerOpen,
    setSelectedRow,
    form,
    defaultValues,
  ]);

  // Our main onSubmit handler
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        const isEdit = !!selectedRow;
        const processedValues = columns
          ? processFormValues(values, columns)
          : values;

        const { error, validationErrors } = await handleSubmitAction({
          apiEndpoint,
          id: selectedRow?.id,
          data: processedValues,
          isEdit,
          columns,
        });

        if (error) {
          // General (non-field) error
          // You could show a toast or set a global error if desired
        } else if (validationErrors) {
          // For each field's error, set it in React Hook Form so they appear in <FormMessage />
          Object.entries(validationErrors).forEach(([fieldName, errorObj]) => {
            const errorMessage =
              typeof errorObj === "string" ? errorObj : errorObj.message;
            form.setError(fieldName, {
              type: "server",
              message: errorMessage || "Invalid input",
            });
          });
        } else {
          closeDrawer();
          // Refresh the table data
          useTableStore.getState().fetchData();
        }
      } catch (error) {
        console.error("Error in handleSubmit:", error);
      }
    },
    [selectedRow, columns, apiEndpoint, closeDrawer, form]
  );

  // Show a confirm dialog if user tries to close the drawer with unsaved changes
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const onClose = useCallback(() => {
    if (form.formState.isDirty) {
      setShowConfirmDialog(true);
    } else {
      closeDrawer();
    }
  }, [form.formState.isDirty, closeDrawer]);

  const drawerTitle = selectedRow ? `Edit ${title}` : `Create ${title}`;
  const drawerDescription = selectedRow
    ? `Edit this ${title.toLowerCase()}`
    : `Add a new ${title.toLowerCase()} to the system`;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-4xl">
            <DrawerHeader className="px-5">
              <DrawerTitle>{drawerTitle}</DrawerTitle>
              <DrawerDescription>{drawerDescription}</DrawerDescription>
            </DrawerHeader>

            <DrawerForm
              columns={columns}
              form={form}
              permissions={permissions}
              data={selectedRow}
              onSubmit={handleSubmit}
              onCancel={onClose}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("you_have_unsaved_changes")}.{" "}
              {t("are_you_sure_you_want_to_close_this_form")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={closeDrawer}>
              {t("Close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
