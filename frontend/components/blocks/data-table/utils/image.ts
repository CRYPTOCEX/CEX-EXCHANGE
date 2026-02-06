import { imageUploader } from "@/utils/upload";

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

/**
 * Helper to upload an image if a file is provided.
 * Returns the image URL on success or throws an error.
 */
async function uploadImageIfNeeded(
  file: any,
  dir: string,
  config: { maxWidth?: number; maxHeight?: number },
  fieldName: string
): Promise<string> {
  if (!(file instanceof File)) {
    return "";
  }
  const size = {
    maxWidth: config.maxWidth ?? 1024,
    maxHeight: config.maxHeight ?? 728,
  };
  const response = await imageUploader({ file, dir, size, oldPath: "" });
  if (response.success) {
    return response.url;
  }
  throw new Error(`Image upload failed for ${fieldName}`);
}

/**
 * Processes image uploads for both top-level image fields and compound columns.
 * Uploads any File instances found in the values and replaces them with URLs.
 */
export async function processImageUploads(
  values: Record<string, any>,
  columns: ColumnDefinition[]
): Promise<Record<string, any>> {
  const processedValues = { ...values };
  const processedKeys = new Set<string>();

  // Build a map of image field keys to their directory names from columns
  const fieldDirMap: Record<string, string> = {};
  const fieldConfigMap: Record<string, { maxWidth?: number; maxHeight?: number }> = {};

  // Map specific compound columns to better directory names
  const dirMapping: Record<string, string> = {
    'depositCompound': 'depositMethods',
    'withdrawCompound': 'withdrawMethods',
    'planCompound': 'plans',
    'methodCompound': 'methods',
    'compoundTitle': 'titles',
  };

  for (const column of columns) {
    const dir = dirMapping[column.key] || column.key;

    // Map top-level image fields
    if (column.type === "image") {
      fieldDirMap[column.key] = dir;
      fieldConfigMap[column.key] = {
        maxWidth: (column as any).maxWidth,
        maxHeight: (column as any).maxHeight,
      };
    }
    // Map compound image fields
    else if (column.type === "compound" && column.render?.config?.image) {
      const imageConfig = column.render.config.image;
      fieldDirMap[imageConfig.key] = dir;
      fieldConfigMap[imageConfig.key] = {
        maxWidth: (imageConfig as any).maxWidth,
        maxHeight: (imageConfig as any).maxHeight,
      };
    }
  }

  // Process all values that are File instances
  for (const [key, value] of Object.entries(values)) {
    if (value instanceof File && !processedKeys.has(key)) {
      // Use mapped directory if available, otherwise use 'uploads' as default
      const dir = fieldDirMap[key] || 'uploads';
      const config = fieldConfigMap[key] || {};

      const url = await uploadImageIfNeeded(value, dir, config, key);
      processedValues[key] = url;
      processedKeys.add(key);
    }
  }

  return processedValues;
}
