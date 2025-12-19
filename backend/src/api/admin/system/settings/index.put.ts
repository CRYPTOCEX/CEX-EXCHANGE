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
  // Logging configuration - ctx will be automatically provided
  logModule: "SETTINGS",
  logTitle: "Update application settings",
};

export default async (data: Handler) => {
  const { body, ctx } = data;

  // Step 1: Validate and filter the request body
  ctx?.step("Validating settings data");
  const validUpdates: Record<string, string> = {};
  let skippedCount = 0;

  Object.entries(body).forEach(([key, value]) => {
    // Skip problematic keys
    if (key === "settings" || key === "extensions") {
      skippedCount++;
      return;
    }

    // Convert value to string and validate
    let stringValue = "";
    if (value === null || value === "null" || value === undefined) {
      stringValue = "";
    } else if (typeof value === "object") {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    validUpdates[key] = stringValue;
  });

  if (skippedCount > 0) {
    ctx?.warn(`Skipped ${skippedCount} problematic setting keys`);
  }

  const updateCount = Object.keys(validUpdates).length;
  ctx?.step(`Processing ${updateCount} settings`);

  // Step 2: Fetch existing settings
  ctx?.step("Loading existing settings");
  const existingSettings = await models.settings.findAll();
  const existingKeys = existingSettings.map((setting) => setting.key);

  // Step 3: Update or create settings
  ctx?.step("Applying settings updates");
  let updatedCount = 0;
  let createdCount = 0;

  const updates = Object.entries(validUpdates).map(async ([key, value]) => {
    if (existingKeys.includes(key)) {
      updatedCount++;
      return models.settings.update({ value }, { where: { key } });
    } else {
      createdCount++;
      return models.settings.create({ key, value });
    }
  });

  await Promise.all(updates);

  if (createdCount > 0) {
    ctx?.step(`Created ${createdCount} new settings`, "success");
  }
  if (updatedCount > 0) {
    ctx?.step(`Updated ${updatedCount} existing settings`, "success");
  }

  // Step 4: Clear cache
  ctx?.step("Clearing settings cache");
  const cacheManager = CacheManager.getInstance();
  await cacheManager.clearCache();

  ctx?.success(`${updateCount} settings saved successfully`);

  return {
    message: "Settings updated successfully",
  };
};
