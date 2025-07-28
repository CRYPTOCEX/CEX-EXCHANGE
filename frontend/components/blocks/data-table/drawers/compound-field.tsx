import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { ImageUpload } from "@/components/ui/image-upload";
import { SelectFormControl } from "./form-controls/select";
import { MultiSelectFormControl } from "./form-controls/multi-select-form-control";
import { Input } from "@/components/ui/input";
interface CompoundFieldProps {
  column: ColumnDefinition;
  form: any;
  permissions: any;
  data: any;
}
export const CompoundField: React.FC<CompoundFieldProps> = ({
  column,
  form,
  permissions,
  data,
}) => {
  const config = column.render?.config;
  if (!config) return null;

  // Determine if we are in edit mode (data exists) or create mode.
  const isEdit = !!data;

  // For each subfield, check based on mode and permissions
  const renderImage =
    config.image &&
    (isEdit
      ? config.image.editable && permissions.edit
      : config.image.usedInCreate && permissions.create);
  const renderPrimary =
    config.primary &&
    (isEdit
      ? config.primary.editable && permissions.edit
      : config.primary.usedInCreate && permissions.create);
  const renderSecondary =
    config.secondary &&
    (isEdit
      ? config.secondary.editable && permissions.edit
      : config.secondary.usedInCreate && permissions.create);
  return (
    <>
      {renderImage && (
        <FormField
          control={form.control}
          name={config.image.key}
          render={({ field, fieldState: { error } }) => (
            <FormItem className="md:col-span-2 space-y-1">
              <FormLabel className={error ? "text-destructive" : ""}>
                {config.image.title}
              </FormLabel>
              <FormControl>
                <ImageUpload
                  onChange={(val) => field.onChange(val)}
                  value={field.value}
                  error={!!error}
                  errorMessage={error?.message}
                />
              </FormControl>
              {config.image.description && (
                <FormDescription>{config.image.description}</FormDescription>
              )}
            </FormItem>
          )}
        />
      )}
      {renderPrimary && (
        <>
          {Array.isArray(config.primary.key) ? (
            config.primary.key.map((key: string, index: number) => {
              const labelText = Array.isArray(config.primary.title)
                ? config.primary.title[index]
                : `${config.primary.title} ${index + 1}`;
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field, fieldState: { error } }) => {
                    return (
                      <FormItem className="space-y-1">
                        <FormLabel className={error ? "text-destructive" : ""}>
                          {labelText}
                          {config.primary.required && (
                            <span className="text-destructive"> *</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder={`Enter ${labelText.toLowerCase()}`}
                            error={!!error}
                            errorMessage={error?.message}
                          />
                        </FormControl>
                        {config.primary.description && (
                          <FormDescription>
                            {Array.isArray(config.primary.description)
                              ? config.primary.description[index]
                              : config.primary.description}
                          </FormDescription>
                        )}
                      </FormItem>
                    );
                  }}
                />
              );
            })
          ) : (
            <FormField
              control={form.control}
              name={config.primary.key}
              render={({ field, fieldState: { error } }) => {
                return (
                  <FormItem className="space-y-1">
                    <FormLabel className={error ? "text-destructive" : ""}>
                      {config.primary.title}
                      {config.primary.required && (
                        <span className="text-destructive"> *</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={`Enter ${config.primary.title.toLowerCase()}`}
                        error={!!error}
                        errorMessage={error?.message}
                      />
                    </FormControl>
                    {config.primary.description && (
                      <FormDescription>
                        {config.primary.description}
                      </FormDescription>
                    )}
                  </FormItem>
                );
              }}
            />
          )}
        </>
      )}
      {renderSecondary && (
        <FormField
          control={form.control}
          name={config.secondary.key}
          render={({ field, fieldState: { error } }) => {
            return (
              <FormItem className="space-y-1">
                <FormLabel className={error ? "text-destructive" : ""}>
                  {config.secondary.title}
                  {config.secondary.required && (
                    <span className="text-destructive"> *</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={`Enter ${config.secondary.title.toLowerCase()}`}
                    error={!!error}
                    errorMessage={error?.message}
                  />
                </FormControl>
                {config.secondary.description && (
                  <FormDescription>
                    {config.secondary.description}
                  </FormDescription>
                )}
              </FormItem>
            );
          }}
        />
      )}
      {config.metadata?.map((item: any) => {
        const renderMetadata = isEdit
          ? item.editable && permissions.edit
          : item.usedInCreate && permissions.create;
        if (renderMetadata) {
          return (
            <FormField
              key={item.key}
              control={form.control}
              name={item.key}
              render={({ field, fieldState: { error } }) => {
                return (
                  <FormItem className="space-y-1">
                    <FormLabel className={error ? "text-destructive" : ""}>
                      {item.title}
                      {item.required && (
                        <span className="text-destructive"> *</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      {item.type === "select" ? (
                        <SelectFormControl
                          field={field}
                          placeholder={`Select ${item.title.toLowerCase()}`}
                          options={item.options}
                          apiEndpoint={item.apiEndpoint}
                          error={error?.message}
                          control={form.control}
                        />
                      ) : item.type === "multiselect" ? (
                        <MultiSelectFormControl
                          field={field}
                          placeholder={`Select ${item.title.toLowerCase()}`}
                          options={item.options}
                          apiEndpoint={item.apiEndpoint}
                          error={error?.message}
                        />
                      ) : (
                        <Input
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder={`Enter ${item.title.toLowerCase()}`}
                          error={!!error}
                          errorMessage={error?.message}
                        />
                      )}
                    </FormControl>
                    {item.description && (
                      <FormDescription>{item.description}</FormDescription>
                    )}
                  </FormItem>
                );
              }}
            />
          );
        }
        return null;
      })}
    </>
  );
};
