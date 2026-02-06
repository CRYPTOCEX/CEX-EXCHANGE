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
  // "text" is legacy value that maps to "input"
  type: z.enum(["input", "textarea", "file", "image", "qr", "text"]),
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
      // Regex to match integers and decimals (e.g., 123, 0.001, .5, 123.456)
      const numberRegex = /^-?\d*\.?\d+$/;
      if (optional) {
        validator = z
          .union([
            z.undefined(),
            z.literal(""),
            z.number(),
            z.string().regex(numberRegex),
          ])
          .transform((val) =>
            val === undefined || val === "" ? undefined : Number(val)
          );
      } else {
        validator = z
          .union([z.number(), z.string().regex(numberRegex)])
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
      type === "textarea" ||
      type === "url" ||
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
  // For string types that are optional, we need to allow empty strings as well as undefined
  if (optional && type !== "number" && type !== "image" && type !== "rating") {
    if (
      validator instanceof z.ZodString &&
      (type === "text" || type === "textarea" || type === "url" || type === "email")
    ) {
      // Allow empty string, undefined, or a valid string
      validator = z.union([z.literal(""), z.string()]).optional();
    } else {
      validator = validator.optional();
    }
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

/** Helper to get compound field mappings from formConfig (fieldKey -> compoundKey) */
function getCompoundFieldMappings(formConfig: FormConfig, isEdit: boolean): Map<string, string> {
  const config = isEdit ? formConfig.edit : formConfig.create;
  if (!config?.groups) return new Map();

  const mappings = new Map<string, string>();
  config.groups.forEach(group => {
    group.fields.forEach(field => {
      if (typeof field === "object" && field.compoundKey) {
        mappings.set(field.key, field.compoundKey);
      }
    });
  });
  return mappings;
}

/** Extract field config from a compound column and create schema for it */
function extractCompoundFieldSchema(
  columns: ColumnDefinition[],
  fieldKey: string,
  compoundKey: string,
  fieldConfig?: FormFieldConfig
): z.ZodTypeAny | null {
  const compoundColumn = columns.find((col) => col.key === compoundKey);
  if (!compoundColumn || compoundColumn.type !== "compound" || !compoundColumn.render?.config) {
    return null;
  }

  const config = compoundColumn.render.config;

  // Check image field
  if (config.image && config.image.key === fieldKey) {
    const required = fieldConfig?.required ?? config.image.required ?? false;
    return required
      ? createImageSchema(true, config.image.title)
      : createImageSchema(false, config.image.title).optional();
  }

  // Check primary field - handle array of keys (e.g., ["firstName", "lastName"])
  if (config.primary) {
    const primaryKeys = Array.isArray(config.primary.key) ? config.primary.key : [config.primary.key];
    const primaryTitles = Array.isArray(config.primary.title) ? config.primary.title : [config.primary.title];
    const keyIndex = primaryKeys.indexOf(fieldKey);
    if (keyIndex !== -1) {
      const title = primaryTitles[keyIndex] || primaryTitles[0] || fieldKey;
      const required = fieldConfig?.required ?? true;
      return required
        ? z.string().min(1, { message: `${title} is required` })
        : z.string().optional();
    }
  }

  // Check secondary field
  if (config.secondary && config.secondary.key === fieldKey) {
    const required = fieldConfig?.required ?? false;
    if (config.secondary.type === "email") {
      return z.string().email({ message: "Invalid email address" });
    }
    return required
      ? z.string().min(1, { message: `${config.secondary.title} is required` })
      : z.string().optional();
  }

  // Check metadata fields
  if (Array.isArray(config.metadata)) {
    const metaItem = config.metadata.find((item: any) => item.key === fieldKey);
    if (metaItem) {
      const required = fieldConfig?.required ?? metaItem.required ?? false;
      let baseSchema: z.ZodTypeAny;
      switch (metaItem.type) {
        case "image":
          return required
            ? createImageSchema(true, metaItem.title)
            : createImageSchema(false, metaItem.title).optional();
        case "date":
          baseSchema = z.string().refine((val) => !isNaN(new Date(val).getTime()), {
            message: "Invalid date",
          });
          break;
        case "select":
          baseSchema = z.string();
          break;
        default:
          baseSchema = z.string();
      }
      return required ? baseSchema.pipe(z.string().min(1)) : baseSchema.optional();
    }
  }

  return null;
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

/**
 * Converts flat schema fields with dot-notation keys to nested Zod schema.
 * For example: { "profile.bio": z.string(), "profile.location.city": z.string() }
 * becomes: z.object({ profile: z.object({ bio: z.string(), location: z.object({ city: z.string() }) }) })
 */
function convertSchemaToNested(schemaFields: Record<string, z.ZodTypeAny>): z.ZodObject<any> {
  const nestedStructure: Record<string, any> = {};

  // First pass: build the nested structure
  for (const [key, schema] of Object.entries(schemaFields)) {
    if (key.includes(".")) {
      const keys = key.split(".");
      let current = nestedStructure;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k]) {
          current[k] = { __children: {} };
        }
        current = current[k].__children;
      }

      current[keys[keys.length - 1]] = { __schema: schema };
    } else {
      nestedStructure[key] = { __schema: schema };
    }
  }

  // Second pass: convert the nested structure to Zod schema
  function buildZodSchema(structure: Record<string, any>): Record<string, z.ZodTypeAny> {
    const result: Record<string, z.ZodTypeAny> = {};

    for (const [key, value] of Object.entries(structure)) {
      if (value.__schema) {
        result[key] = value.__schema;
      } else if (value.__children) {
        const childSchema = buildZodSchema(value.__children);
        // Make nested objects optional/passthrough to allow partial data
        result[key] = z.object(childSchema).optional();
      }
    }

    return result;
  }

  return z.object(buildZodSchema(nestedStructure));
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

  // Get compound field mappings (fieldKey -> compoundKey)
  const compoundMappings = formConfig
    ? getCompoundFieldMappings(formConfig, isEdit)
    : new Map();

  // First, process fields that are extracted from compound columns
  if (formConfig && compoundMappings.size > 0) {
    compoundMappings.forEach((compoundKey, fieldKey) => {
      const fieldConfig = getFieldConfig(formConfig, fieldKey, isEdit);
      const schema = extractCompoundFieldSchema(columns, fieldKey, compoundKey, fieldConfig);
      if (schema) {
        schemaFields[fieldKey] = schema;
      }
    });
  }

  columns.forEach((column) => {
    // Skip if this field is already handled as a compound field extraction
    if (compoundMappings.has(column.key)) {
      return;
    }

    // If we have formConfig, only include fields that are in formConfig
    // Check both column.key and column.baseKey (for select fields that map to different API keys)
    const columnMatchesFormConfig = allowedKeys
      ? allowedKeys.has(column.key) || (column.baseKey && allowedKeys.has(column.baseKey))
      : true;
    if (!columnMatchesFormConfig) {
      return;
    }

    // Determine which key to use for looking up field config
    const formConfigKey = column.baseKey && allowedKeys?.has(column.baseKey) ? column.baseKey : column.key;

    // Get field config overrides from formConfig
    const fieldConfig = formConfig
      ? getFieldConfig(formConfig, formConfigKey, isEdit)
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

    // Skip compound columns - they should be handled via formConfig with compoundKey
    if (mergedColumn.type === "compound") {
      return;
    }

    // Handle custom fields.
    if (mergedColumn.type === "customFields") {
      schemaFields[mergedColumn.key] = z.array(customFieldSchema);
      return;
    }

    // For normal columns - include if in formConfig or has legacy flags
    // A field is optional if: optional flag is true, OR required is explicitly false
    const isRequired = mergedColumn.required === true;
    const isOptional = mergedColumn.optional === true || mergedColumn.required === false;
    const base = createBaseSchemaForType(
      mergedColumn.type,
      isRequired,
      isOptional,
      mergedColumn.title
    );
    schemaFields[mergedColumn.key] = applyCustomValidation(base, mergedColumn);
  });

  // Check if we have any dot-notation keys that need to be converted to nested schema
  const hasDotNotationKeys = Object.keys(schemaFields).some(key => key.includes("."));
  if (hasDotNotationKeys) {
    return convertSchemaToNested(schemaFields);
  }

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

/**
 * Helper to get a value from a nested path in an object.
 * For example: getNestedValue(obj, "profile.location.city") returns obj.profile.location.city
 */
function getNestedValue(obj: any, path: string): any {
  if (!path.includes(".")) {
    return obj[path];
  }
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

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
          const targetKey = item.baseKey || item.key;
          if (item.type === "select") {
            formattedData[targetKey] =
              item.idKey && raw
                ? getStringValueByIdKey(raw, item.idKey)
                : raw?.toString() || "";
          } else if (item.type === "multiselect") {
            const rawParsed = parseJsonField(formattedData[item.key]);
            formattedData[targetKey] = Array.isArray(rawParsed)
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
            formattedData[targetKey] = formatDate(formattedData[item.key]);
          } else {
            formattedData[targetKey] = formattedData[item.key] ?? "";
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
      const rawValue = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      const raw = parseJsonField(rawValue);
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
      const raw = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      formattedData[column.key] =
        column.idKey && raw
          ? getStringValueByIdKey(raw, column.idKey)
          : raw?.toString() || "";
    }
    // Handle tags.
    else if (column.type === "tags") {
      const value = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      formattedData[column.key] = Array.isArray(value) ? value : [];
    }
    // Handle image.
    else if (column.type === "image") {
      // Use getNestedValue for dot-notation keys
      const value = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      formattedData[column.key] = value ?? null;
    }
    // For rating, leave the value as is (or set to undefined if null)
    else if (column.type === "rating") {
      const value = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      formattedData[column.key] = value ?? undefined;
    }
    // Handle boolean/toggle - ensure we get a boolean value
    else if (column.type === "boolean" || column.type === "toggle") {
      const value = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      // Convert to boolean: handle objects with 'enabled' property, strings, etc.
      if (typeof value === "object" && value !== null && "enabled" in value) {
        formattedData[column.key] = Boolean(value.enabled);
      } else if (typeof value === "string") {
        formattedData[column.key] = value === "true" || value === "1";
      } else {
        formattedData[column.key] = Boolean(value);
      }
    }
    // Fallback.
    else {
      // Use getNestedValue for dot-notation keys (e.g., "profile.bio")
      const value = column.key.includes(".")
        ? getNestedValue(data, column.key)
        : formattedData[column.key];
      formattedData[column.key] = value ?? "";
    }
  });

  // Convert dot-notation keys to nested objects for react-hook-form compatibility
  return convertDotNotationToNested(formattedData);
};

/**
 * Helper to set a value at a nested path in an object.
 * For example: setNestedValue(obj, "profile.location.city", "NYC")
 * will create { profile: { location: { city: "NYC" } } }
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Converts flat dot-notation keys to nested object structure.
 * For example: { "profile.bio": "test", "profile.location.city": "NYC" }
 * becomes: { profile: { bio: "test", location: { city: "NYC" } } }
 */
function convertDotNotationToNested(values: any): any {
  const result: any = {};

  for (const key of Object.keys(values)) {
    if (key.includes(".")) {
      setNestedValue(result, key, values[key]);
    } else {
      result[key] = values[key];
    }
  }

  return result;
}

/**
 * Processes form values before submission.
 * Converts arrays, transforms multiselect/select values,
 * maps baseKey fields, removes empty optional fields,
 * and converts dot-notation keys to nested objects.
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
          if (item.baseKey && item.key in processedValues) {
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

  // Convert dot-notation keys (e.g., "profile.bio") to nested objects
  return convertDotNotationToNested(processedValues);
};

/** Get default value for a field type */
function getDefaultValueForType(type: ColumnType | undefined, options?: any[]): any {
  switch (type) {
    case "number":
      return undefined;
    case "boolean":
    case "toggle":
      return false;
    case "date":
      return "";
    case "tags":
      return [];
    case "select":
      return options?.[0]?.value || "";
    case "image":
      return "";
    case "multiselect":
      return [];
    case "customFields":
      return [];
    case "rating":
      return undefined;
    default:
      return "";
  }
}

/**
 * Returns an object with default values for each column based on formConfig.
 * For customFields, defaults to an empty array.
 */
export const getDefaultValues = (
  columns: ColumnDefinition[],
  formConfig?: FormConfig,
  isEdit: boolean = false
) => {
  const defaults: Record<string, any> = {};

  // Get allowed field keys from formConfig
  const allowedKeys = formConfig
    ? getFormConfigFieldKeys(formConfig, isEdit)
    : null;

  // Get compound field mappings (fieldKey -> compoundKey)
  const compoundMappings = formConfig
    ? getCompoundFieldMappings(formConfig, isEdit)
    : new Map();

  // First, add defaults for fields extracted from compound columns
  if (formConfig && compoundMappings.size > 0) {
    compoundMappings.forEach((compoundKey, fieldKey) => {
      const compoundColumn = columns.find((col) => col.key === compoundKey);
      if (!compoundColumn || compoundColumn.type !== "compound" || !compoundColumn.render?.config) {
        return;
      }

      const config = compoundColumn.render.config;

      // Check image field
      if (config.image && config.image.key === fieldKey) {
        defaults[fieldKey] = "";
        return;
      }

      // Check primary field - handle array of keys (e.g., ["firstName", "lastName"])
      if (config.primary) {
        const primaryKeys = Array.isArray(config.primary.key) ? config.primary.key : [config.primary.key];
        if (primaryKeys.includes(fieldKey)) {
          defaults[fieldKey] = "";
          return;
        }
      }

      // Check secondary field
      if (config.secondary && config.secondary.key === fieldKey) {
        defaults[fieldKey] = "";
        return;
      }

      // Check metadata fields
      if (Array.isArray(config.metadata)) {
        const metaItem = config.metadata.find((item: any) => item.key === fieldKey);
        if (metaItem) {
          defaults[fieldKey] = getDefaultValueForType(metaItem.type, metaItem.options);
        }
      }
    });
  }

  // Then process regular columns
  columns.forEach((column) => {
    // Skip if this field is already handled as a compound field extraction
    if (compoundMappings.has(column.key)) {
      return;
    }

    // If we have formConfig, only include fields that are in formConfig
    // Check both column.key and column.baseKey (for select fields that map to different API keys)
    const columnMatchesFormConfig = allowedKeys
      ? allowedKeys.has(column.key) || (column.baseKey && allowedKeys.has(column.baseKey))
      : true;
    if (!columnMatchesFormConfig) {
      return;
    }

    // Determine which key to use for looking up field config
    const formConfigKey = column.baseKey && allowedKeys?.has(column.baseKey) ? column.baseKey : column.key;

    // Get field config overrides from formConfig
    const fieldConfig = formConfig
      ? getFieldConfig(formConfig, formConfigKey, isEdit)
      : undefined;

    // Merge options from fieldConfig if present
    const options = fieldConfig?.options || column.options;

    defaults[column.key] = getDefaultValueForType(column.type, options);
  });

  // Convert dot-notation keys to nested objects for react-hook-form compatibility
  // e.g., {"profile.bio": ""} becomes {profile: {bio: ""}}
  return convertDotNotationToNested(defaults);
};
