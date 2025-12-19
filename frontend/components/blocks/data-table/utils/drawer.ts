import * as z from "zod";
import { ColumnType, TableState, FormConfig, FormFieldConfig } from "../types/table";

/** Checks if a given string is an absolute or relative image URL. */
function isValidImageUrl(val: string): boolean {
  return /^https?:\/\//.test(val) || /^\//.test(val);
}

/** Creates a Zod schema for image fields. */
function createImageSchema(required: boolean, title?: string) {
  const imageValidator = z.string().refine(isValidImageUrl, {
    message: "Invalid url",
  });

  if (required) {
    // Must be either a File or a valid URL
    return z.union([z.instanceof(File), imageValidator]);
  }
  // Allow undefined, an empty string, a File, null, or a valid image URL
  return z.union([
    z.undefined(),
    z.literal(""),
    z.instanceof(File),
    z.null(),
    imageValidator,
  ]);
}

/** Schema for one custom field object. */
const customFieldSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["input", "textarea", "file", "image"]),
  required: z.boolean(),
});

/**
 * Creates a base schema for a given column type.
 * For number, date, boolean, image, email, tags, select, multiselect, text, and rating.
 */
function createBaseSchemaForType(
  type: ColumnType,
  required: boolean,
  optional: boolean,
  title?: string
): z.ZodTypeAny {
  let validator: z.ZodTypeAny;

  switch (type) {
    case "number": {
      if (optional) {
        validator = z
          .union([
            z.undefined(),
            z.literal(""),
            z.number(),
            z.string().regex(/^\d+$/),
          ])
          .transform((val) =>
            val === undefined || val === "" ? undefined : Number(val)
          );
      } else {
        validator = z
          .union([z.number(), z.string().regex(/^\d+$/)])
          .transform(Number);
      }
      break;
    }
    case "date": {
      validator = z.string().refine((val) => !isNaN(new Date(val).getTime()), {
        message: "Invalid date",
      });
      break;
    }
    case "boolean":
    case "toggle": {
      validator = z.boolean();
      break;
    }
    case "image": {
      validator = createImageSchema(required, title);
      break;
    }
    case "email": {
      validator = z.string().email({ message: "Invalid email address" });
      break;
    }
    case "tags": {
      validator = z.array(z.string());
      break;
    }
    case "select": {
      validator = z.string();
      break;
    }
    case "multiselect": {
      validator = z.array(
        z.object({
          id: z.union([z.string(), z.number()]),
          name: z.string().optional(),
        })
      );
      break;
    }
    case "rating": {
      // New rating field: expect a number between 1 and 5.
      if (optional) {
        validator = z
          .union([
            z.undefined(),
            z
              .number()
              .min(1, { message: "Rating must be at least 1" })
              .max(5, { message: "Rating must be at most 5" }),
            z.string().regex(/^\d+$/).transform(Number),
          ])
          .refine((val) => val === undefined || (val >= 1 && val <= 5), {
            message: "Rating must be between 1 and 5",
          });
      } else {
        validator = z
          .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
          .refine((val) => val >= 1 && val <= 5, {
            message: "Rating must be between 1 and 5",
          });
      }
      break;
    }
    default:
      // Default to a string.
      validator = z.string();
      break;
  }

  // For certain string-like types, if required, enforce a minimum length.
  if (
    required &&
    (type === "text" ||
      type === "email" ||
      type === "date" ||
      type === "select")
  ) {
    if (validator instanceof z.ZodString) {
      validator = validator.min(1, {
        message: title ? `${title} is required` : "Required",
      });
    }
  }

  // Mark as optional if allowed (except for number, image, and rating types).
  if (optional && type !== "number" && type !== "image" && type !== "rating") {
    validator = validator.optional();
  }

  return validator;
}

/** Applies custom validation if provided. */
function applyCustomValidation(
  baseSchema: z.ZodTypeAny,
  columnOrItem: { validation?: (val: any) => string | null; key: string }
): z.ZodTypeAny {
  // If there's a custom validator and this isn't an "email" column, refine further
  if (columnOrItem.validation && columnOrItem.key !== "email") {
    return baseSchema.refine(
      (val: any) => columnOrItem.validation!(val) === null,
      {
        message: columnOrItem.validation!(columnOrItem.key) || "Invalid input",
      }
    );
  }
  return baseSchema;
}

/** Helper to process compound column. */
function processCompoundColumn(
  column: ColumnDefinition
): Record<string, z.ZodTypeAny> {
  const fields: Record<string, z.ZodTypeAny> = {};
  const config = column.render?.config;
  if (!config) return fields;

  // Process image subfield.
  if (config.image && (config.image.usedInCreate || config.image.editable)) {
    const required = !!config.image.required;
    fields[config.image.key] = required
      ? createImageSchema(required, config.image.title)
      : createImageSchema(required, config.image.title).optional();
  }

  // Process primary subfield.
  if (
    config.primary &&
    (config.primary.usedInCreate || config.primary.editable)
  ) {
    if (Array.isArray(config.primary.key)) {
      config.primary.key.forEach((k) => {
        fields[k] = z
          .string()
          .min(1, { message: `${config.primary.title} is required` });
      });
    } else {
      fields[config.primary.key] = z
        .string()
        .min(1, { message: `${config.primary.title} is required` });
    }
  }

  // Process secondary subfield. (Now checks type to avoid forcing email.)
  if (
    config.secondary &&
    (config.secondary.usedInCreate || config.secondary.editable)
  ) {
    if (config.secondary.type === "email") {
      fields[config.secondary.key] = z
        .string()
        .email({ message: "Invalid email address" });
    } else {
      fields[config.secondary.key] = z
        .string()
        .min(1, { message: `${config.secondary.title} is required` });
    }
  }

  // Process metadata subfields.
  if (Array.isArray(config.metadata)) {
    config.metadata.forEach((item) => {
      if (!(item.usedInCreate || item.editable)) {
        return;
      }
      let baseSchema: z.ZodTypeAny;
      switch (item.type) {
        case "image":
          baseSchema = createImageSchema(!!item.required, item.title);
          break;
        case "date":
          baseSchema = z
            .string()
            .refine((val) => !isNaN(new Date(val).getTime()), {
              message: "Invalid date",
            });
          break;
        case "select":
          baseSchema = z.string();
          break;
        default:
          baseSchema = z.string();
      }
      fields[item.key] = applyCustomValidation(baseSchema, item);
    });
  }

  return fields;
}

/** Helper to get all field keys from formConfig */
function getFormConfigFieldKeys(formConfig: FormConfig, isEdit: boolean): Set<string> {
  const config = isEdit ? formConfig.edit : formConfig.create;
  if (!config?.groups) return new Set();

  const keys = new Set<string>();
  config.groups.forEach(group => {
    group.fields.forEach(field => {
      const key = typeof field === "string" ? field : field.key;
      keys.add(key);
    });
  });
  return keys;
}

/** Helper to get field config from formConfig */
function getFieldConfig(formConfig: FormConfig, key: string, isEdit: boolean): FormFieldConfig | undefined {
  const config = isEdit ? formConfig.edit : formConfig.create;
  if (!config?.groups) return undefined;

  for (const group of config.groups) {
    for (const field of group.fields) {
      if (typeof field === "string") {
        if (field === key) return undefined;
      } else if (field.key === key) {
        return field;
      }
    }
  }
  return undefined;
}

/** Builds a Zod schema object for all columns based on formConfig. */
export const generateSchema = (
  columns: ColumnDefinition[],
  formConfig?: FormConfig,
  isEdit: boolean = false
) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  if (!Array.isArray(columns)) {
    console.error("Invalid columns provided to generateSchema");
    return z.object({});
  }

  // Get allowed field keys from formConfig
  const allowedKeys = formConfig
    ? getFormConfigFieldKeys(formConfig, isEdit)
    : null;

  columns.forEach((column) => {
    // If we have formConfig, only include fields that are in formConfig
    if (allowedKeys && !allowedKeys.has(column.key)) {
      return;
    }

    // Get field config overrides from formConfig
    const fieldConfig = formConfig
      ? getFieldConfig(formConfig, column.key, isEdit)
      : undefined;

    // Merge field config with column
    const mergedColumn = fieldConfig ? {
      ...column,
      required: fieldConfig.required ?? column.required,
      validation: fieldConfig.validation || column.validation,
      options: fieldConfig.options || column.options,
      min: fieldConfig.min ?? column.min,
      max: fieldConfig.max ?? column.max,
    } : column;

    // Handle compound columns.
    if (mergedColumn.type === "compound" && mergedColumn.render?.config) {
      Object.assign(schemaFields, processCompoundColumn(mergedColumn));
      return;
    }

    // Handle custom fields.
    if (mergedColumn.type === "customFields") {
      schemaFields[mergedColumn.key] = z.array(customFieldSchema);
      return;
    }

    // For normal columns - include if in formConfig or has legacy flags
    const isOptional = !!mergedColumn.optional;
    const base = createBaseSchemaForType(
      mergedColumn.type,
      !!mergedColumn.required,
      isOptional,
      mergedColumn.title
    );
    schemaFields[mergedColumn.key] = applyCustomValidation(base, mergedColumn);
  });

  return z.object(schemaFields);
};

/** --- Data Formatting Helpers --- */

/** Tries to parse a JSON string; if parsing fails, returns an empty array. */
function parseJsonField(value: any): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
}

/** Formats a date value as YYYY-MM-DD. */
function formatDate(dateVal: any): string {
  const date = new Date(dateVal);
  return date.toISOString().split("T")[0];
}

/** Retrieves a string value from an object by idKey. */
function getStringValueByIdKey(obj: any, idKey: string) {
  if (obj && typeof obj === "object" && obj[idKey] != null) {
    return obj[idKey].toString();
  }
  return "";
}

/** --- Data Formatting Functions --- */

/** Formats raw data for the form based on column definitions. */
export const formatDataForForm = (data: any, columns: ColumnDefinition[]) => {
  const formattedData = { ...data };

  columns.forEach((column) => {
    // Handle compound columns.
    if (column.type === "compound" && column.render?.config) {
      const { metadata } = column.render.config;
      if (Array.isArray(metadata)) {
        metadata.forEach((item) => {
          const raw = formattedData[item.key];
          if (item.type === "select") {
            formattedData[item.key] =
              item.idKey && raw
                ? getStringValueByIdKey(raw, item.idKey)
                : raw?.toString() || "";
          } else if (item.type === "multiselect") {
            const rawParsed = parseJsonField(formattedData[item.key]);
            formattedData[item.key] = Array.isArray(rawParsed)
              ? rawParsed.map((val: any) => {
                  if (val && typeof val === "object" && val.id) {
                    // If it's already an object with id, check if it has name
                    if (val.name) return val;
                    // If it has duration and timeframe (like investment durations), format the name
                    if (val.duration && val.timeframe) {
                      return { id: val.id, name: `${val.duration} ${val.timeframe}` };
                    }
                    // Otherwise use the id as name
                    return { id: val.id, name: val.id };
                  }
                  const found = item.options?.find((o) => o.value === val);
                  return { id: val, name: found?.label || val };
                })
              : [];
          } else if (item.type === "date" && formattedData[item.key]) {
            formattedData[item.key] = formatDate(formattedData[item.key]);
          } else {
            formattedData[item.key] = formattedData[item.key] ?? "";
          }
        });
      }
      return;
    }

    // Handle customFields.
    if (column.type === "customFields") {
      let raw = formattedData[column.key];
      raw = parseJsonField(raw);
      formattedData[column.key] = Array.isArray(raw) ? raw : [];
      return;
    }

    // Handle multiselect.
    if (column.type === "multiselect") {
      const raw = parseJsonField(formattedData[column.key]);
      formattedData[column.key] = Array.isArray(raw)
        ? raw.map((val: any) => {
            if (val && typeof val === "object" && val.id) {
              // If it's already an object with id, check if it has name
              if (val.name) return val;
              // If it has duration and timeframe (like investment durations), format the name
              if (val.duration && val.timeframe) {
                return { id: val.id, name: `${val.duration} ${val.timeframe}` };
              }
              // Otherwise use the id as name
              return { id: val.id, name: val.id };
            }
            const found = column.options?.find((o) => o.value === val);
            return { id: val, name: found?.label || val };
          })
        : [];
    }
    // Handle select.
    else if (column.type === "select") {
      const raw = formattedData[column.key];
      formattedData[column.key] =
        column.idKey && raw
          ? getStringValueByIdKey(raw, column.idKey)
          : raw?.toString() || "";
    }
    // Handle tags.
    else if (column.type === "tags") {
      formattedData[column.key] = Array.isArray(formattedData[column.key])
        ? formattedData[column.key]
        : [];
    }
    // Handle image.
    else if (column.type === "image") {
      formattedData[column.key] = formattedData[column.key] ?? null;
    }
    // For rating, leave the value as is (or set to undefined if null)
    else if (column.type === "rating") {
      formattedData[column.key] = formattedData[column.key] ?? undefined;
    }
    // Fallback.
    else {
      formattedData[column.key] = formattedData[column.key] ?? "";
    }
  });

  return formattedData;
};

/**
 * Processes form values before submission.
 * Converts arrays, transforms multiselect/select values,
 * maps baseKey fields, and removes empty optional fields.
 */
export const processFormValues = (values: any, columns: ColumnDefinition[]) => {
  const processedValues = { ...values };

  columns.forEach((column) => {
    // Handle compound columns.
    if (column.type === "compound" && column.render?.config) {
      const { metadata } = column.render.config;
      if (Array.isArray(metadata)) {
        metadata.forEach((item) => {
          if (item.type === "multiselect") {
            const arr = processedValues[item.key];
            if (Array.isArray(arr)) {
              processedValues[item.key] = arr.map((obj: any) =>
                typeof obj === "object" && obj.id != null
                  ? obj.id.toString()
                  : obj.toString()
              );
            }
          } else if (item.type === "select") {
            const val = processedValues[item.key];
            if (typeof val === "object" && val !== null) {
              processedValues[item.key] = val.id?.toString() || "";
            }
          }
          if (item.baseKey) {
            processedValues[item.baseKey] = processedValues[item.key];
            delete processedValues[item.key];
          }
        });
      }
      return;
    }

    // Handle multiselect.
    else if (column.type === "multiselect") {
      const arr = processedValues[column.key];
      if (Array.isArray(arr)) {
        processedValues[column.key] = arr.map((obj: any) =>
          typeof obj === "object" && obj.id != null
            ? obj.id.toString()
            : obj.toString()
        );
      }
    }
    // Handle select.
    else if (column.type === "select") {
      const val = processedValues[column.key];
      if (typeof val === "object" && val !== null) {
        processedValues[column.key] = val.id?.toString() || "";
      }
    }
    // Handle tags.
    else if (column.type === "tags") {
      processedValues[column.key] = Array.isArray(processedValues[column.key])
        ? processedValues[column.key]
        : [];
    }

    // Map baseKey if provided.
    if (column.baseKey) {
      processedValues[column.baseKey] = processedValues[column.key];
      delete processedValues[column.key];
    }

    // Remove empty optional fields.
    if (column.optional) {
      const val = processedValues[column.key];
      // For rating, do not force empty string; leave undefined if missing.
      if (column.type === "rating") {
        if (val === undefined) delete processedValues[column.key];
      } else {
        if (val === undefined || val === "") {
          delete processedValues[column.key];
        }
      }
    }
  });

  return processedValues;
};

/**
 * Returns an object with default values for each column based on formConfig.
 * For customFields, defaults to an empty array.
 */
export const getDefaultValues = (
  columns: ColumnDefinition[],
  formConfig?: FormConfig,
  isEdit: boolean = false
) => {
  // Get allowed field keys from formConfig
  const allowedKeys = formConfig
    ? getFormConfigFieldKeys(formConfig, isEdit)
    : null;

  return columns.reduce(
    (acc, column) => {
      // If we have formConfig, only include fields that are in formConfig
      if (allowedKeys && !allowedKeys.has(column.key)) {
        return acc;
      }

      // Get field config overrides from formConfig
      const fieldConfig = formConfig
        ? getFieldConfig(formConfig, column.key, isEdit)
        : undefined;

      // Merge options from fieldConfig if present
      const options = fieldConfig?.options || column.options;

      switch (column.type) {
        case "number":
          acc[column.key] = undefined;
          break;
        case "boolean":
        case "toggle":
          acc[column.key] = false;
          break;
        case "date":
          acc[column.key] = "";
          break;
        case "tags":
          acc[column.key] = [];
          break;
        case "select":
          acc[column.key] = options?.[0]?.value || "";
          break;
        case "image":
          acc[column.key] = "";
          break;
        case "multiselect":
          acc[column.key] = [];
          break;
        case "customFields":
          acc[column.key] = [];
          break;
        case "rating":
          acc[column.key] = undefined;
          break;
        default:
          acc[column.key] = "";
      }
      return acc;
    },
    {} as Record<string, any>
  );
};
