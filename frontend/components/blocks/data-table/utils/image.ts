import { imageUploader } from "@/utils/upload";

/**
 * Carries WHICH field failed, so the caller can put the message on that field
 * instead of dropping a generic one on the whole form.
 *
 * The upload runs before the create/update request, so a failure here means
 * the record was never written at all — an operator who is not told which
 * field is at fault sees a Save button that does nothing.
 */
export class ImageUploadError extends Error {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

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
  // `imageUploader` already knows why — the file was too large for the route,
  // the MIME type is not on the server allowlist, the request 401'd. Passing
  // that through is the difference between "fix this and retry" and a dead
  // button.
  throw new ImageUploadError(
    fieldName,
    response.error || `Image upload failed for ${fieldName}`
  );
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

  // Which keys hold a LIST of images rather than one. Their value never
  // satisfies `value instanceof File`, so without this set the loop below
  // walked straight past them and the files reached the API as `File` objects
  // that `JSON.stringify` renders as `{}`.
  const galleryKeys = new Set<string>();

  for (const column of columns) {
    const dir = dirMapping[column.key] || column.key;

    if (column.type === "gallery") {
      galleryKeys.add(column.key);
      fieldDirMap[column.key] = dir;
      fieldConfigMap[column.key] = {
        maxWidth: (column as any).maxWidth,
        maxHeight: (column as any).maxHeight,
      };
    }
    // Map top-level image fields
    else if (column.type === "image") {
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

  // Process gallery lists first. Each slot is independent — a stored path is
  // carried straight through, a newly picked file is uploaded — and the ORDER
  // is the merchant's arrangement, so the result has to stay index-aligned.
  // Uploads run in sequence rather than through `Promise.all` so a 12-image
  // gallery does not open twelve concurrent multi-megabyte requests.
  for (const key of galleryKeys) {
    const value = values[key];
    if (!Array.isArray(value)) continue;

    const dir = fieldDirMap[key] || "uploads";
    const config = fieldConfigMap[key] || {};
    const urls: string[] = [];

    for (const entry of value) {
      if (entry instanceof File) {
        urls.push(await uploadImageIfNeeded(entry, dir, config, key));
      } else if (typeof entry === "string" && entry.trim()) {
        urls.push(entry.trim());
      }
    }

    processedValues[key] = urls;
    processedKeys.add(key);
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
