import React, { useCallback, useMemo } from "react";
import { Form } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import { CompoundField } from "./compound-field";
import { RegularField } from "./regular-field";
import { useTranslations } from "next-intl";

interface DrawerFormProps {
  columns: ColumnDefinition[];
  form: any;
  permissions: any;
  data: any;
  onSubmit: (values: any) => void;
  onCancel?: () => void;
}

export const DrawerForm = React.memo<DrawerFormProps>(
  ({ columns, form, permissions, data, onSubmit, onCancel }) => {
    const t = useTranslations(
      "components/blocks/data-table/drawers/drawer-form"
    );
    const handleFormSubmit = useCallback(
      (values: any) => {
        onSubmit(values);
      },
      [onSubmit]
    );

    const watchedValues = form.watch();

    const filteredColumns = useMemo(() => {
      return columns.filter((column) => {
        // Process compound columns: include only if at least one subfield is allowed.
        if (column.type === "compound") {
          const config = column.render?.config;
          if (!config) return false;
          const { image, primary, secondary, metadata } = config;
          const isAllowed =
            (image && (image.usedInCreate || image.editable)) ||
            (primary && (primary.usedInCreate || primary.editable)) ||
            (secondary && (secondary.usedInCreate || secondary.editable)) ||
            (Array.isArray(metadata) &&
              metadata.some((item) => item.usedInCreate || item.editable));
          if (!isAllowed) return false;
        } else {
          // For normal columns, require at least one flag to be true.
          if (!(column.usedInCreate || column.editable)) return false;
        }

        // Process any additional conditions if defined.
        if (column.condition === undefined) return true;
        if (Array.isArray(column.condition)) {
          return column.condition.every((cond) => {
            if (typeof cond === "boolean") return cond;
            if (typeof cond === "function") return cond(watchedValues);
            return false;
          });
        }
        if (typeof column.condition === "boolean") return column.condition;
        if (typeof column.condition === "function")
          return column.condition(watchedValues);
        return true;
      });
    }, [columns, watchedValues]);

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            (values) => {
              console.log("Valid submission values:", values);
              handleFormSubmit(values);
            },
            (errors) => {
              console.log("Current form values:", form.getValues());
              console.log("Validation errors:", errors);
            }
          )}
        >
          <div className="p-4">
            <ScrollArea className="h-[calc(100vh-24rem)] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1 pb-4">
                {Array.isArray(filteredColumns) ? (
                  filteredColumns.map((column) => {
                    if (column.type === "compound") {
                      return (
                        <CompoundField
                          key={column.key}
                          column={column}
                          form={form}
                          permissions={permissions}
                          data={data}
                        />
                      );
                    } else if (column.usedInCreate || column.editable) {
                      return (
                        <RegularField
                          key={column.key}
                          column={column}
                          form={form}
                          permissions={permissions}
                          data={data}
                        />
                      );
                    }
                    return null;
                  })
                ) : (
                  <p>{t("no_columns_defined")}</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <DrawerFooter className="px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Button
                type="submit"
                disabled={!permissions.edit && !permissions.create}
              >
                {t("Submit")}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                {t("Cancel")}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </Form>
    );
  }
);

DrawerForm.displayName = "DrawerForm";
