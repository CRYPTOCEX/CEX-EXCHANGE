import { models } from "@b/db";
import { CacheManager } from "@b/utils/cache";

export const metadata = {
  summary: "Updates application settings",
  operationId: "updateApplicationSettings",
  tags: ["Admin", "Settings"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            data: {
              type: "object",
              description: "Settings data to update",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Settings updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Confirmation message indicating successful update",
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized, admin permission required",
    },
    500: {
      description: "Internal server error",
    },
  },
  permission: "edit.settings",
  requiresAuth: true,
};

export default async (data: { body: { [key: string]: unknown } }) => {
  const { body } = data;

  // Validate and filter the request body
  const validUpdates: Record<string, string> = {};
  
  Object.entries(body).forEach(([key, value]) => {
    // Skip problematic keys
    if (key === "settings" || key === "extensions") {
      console.warn(`Skipping problematic setting key: ${key}`);
      return;
    }
    
    // Convert value to string and validate
    let stringValue = "";
    if (value === null || value === "null" || value === undefined) {
      stringValue = "";
    } else {
      stringValue = String(value);
      
      // Check for invalid serialized objects
      if (stringValue.includes('[object Object]')) {
        console.warn(`Skipping setting ${key} with invalid serialized value: ${stringValue}`);
        return;
      }
    }
    
    validUpdates[key] = stringValue;
  });

  // Fetch all existing settings keys.
  const existingSettings = await models.settings.findAll();
  const existingKeys = existingSettings.map((setting) => setting.key);

  // For every valid key in the request body, update or create the record.
  const updates = Object.entries(validUpdates).map(async ([key, value]) => {
    if (existingKeys.includes(key)) {
      return models.settings.update({ value }, { where: { key } });
    } else {
      return models.settings.create({ key, value });
    }
  });

  await Promise.all(updates);

  // Do not remove any settings not included in the request body.
  // This ensures that settings pages performing partial updates do not cause unintended deletions.

  // Clear cache to reflect updated settings.
  const cacheManager = CacheManager.getInstance();
  await cacheManager.clearCache();

  return {
    message: "Settings updated successfully",
  };
};
