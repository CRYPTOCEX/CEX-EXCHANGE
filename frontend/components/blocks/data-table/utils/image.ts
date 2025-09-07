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
 */
export async function processImageUploads(
  values: Record<string, any>,
  columns: ColumnDefinition[]
): Promise<Record<string, any>> {
  const processedValues = { ...values };

  for (const column of columns) {
    // Use a more appropriate directory name for different column types
    let dir = column.key;
    
    // Map specific compound columns to better directory names
    const dirMapping: Record<string, string> = {
      'depositCompound': 'depositMethods',
      'withdrawCompound': 'withdrawMethods',
      'planCompound': 'plans',
      'methodCompound': 'methods',
      'compoundTitle': 'titles',
    };
    
    // Use mapped directory if available, otherwise use column key
    if (dirMapping[column.key]) {
      dir = dirMapping[column.key];
    }

    // Process top-level image field.
    if (column.type === "image") {
      const file = values[column.key];
      if (file instanceof File) {
        const url = await uploadImageIfNeeded(
          file,
          dir,
          {
            maxWidth: (column as any).maxWidth,
            maxHeight: (column as any).maxHeight,
          },
          column.key
        );
        processedValues[column.key] = url;
      }
    }
    // Process compound image field.
    else if (
      column.type === "compound" &&
      column.render?.config?.image &&
      (column.render.config.image.usedInCreate ||
        column.render.config.image.editable)
    ) {
      const imageConfig = column.render.config.image;
      const imageFieldKey = imageConfig.key;
      const file = values[imageFieldKey];
      if (file instanceof File) {
        const url = await uploadImageIfNeeded(
          file,
          dir,
          {
            maxWidth: (imageConfig as any).maxWidth,
            maxHeight: (imageConfig as any).maxHeight,
          },
          imageFieldKey
        );
        processedValues[imageFieldKey] = url;
      }
    }
  }

  return processedValues;
}
