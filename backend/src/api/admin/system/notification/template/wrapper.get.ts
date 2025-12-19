import { createError } from "@b/utils/error";
import fs from "fs/promises";
import path from "path";
import { isProduction, baseUrl } from "@b/utils/constants";

export const metadata = {
  summary: "Retrieves the email wrapper template HTML",
  operationId: "getEmailWrapperTemplate",
  tags: ["Admin", "Notifications"],
  permission: "view.notification.template",
  responses: {
    200: {
      description: "Email wrapper template retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "The HTML content of the email wrapper template",
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized, permission required to view notification",
    },
    404: {
      description: "Email wrapper template not found",
    },
    500: {
      description: "Internal server error",
    },
  },
  requiresAuth: true,
};

export default async (_data: Handler) => {
  try {
    // Determine the correct email template path based on environment
    let templatePath: string;

    if (isProduction) {
      // In production, email templates are in backend/email/templates
      templatePath = path.join(process.cwd(), "backend", "email", "templates", "generalTemplate.html");
    } else {
      // In development, use baseUrl to locate templates
      templatePath = path.join(baseUrl, "email", "templates", "generalTemplate.html");
    }

    // Check if path exists using async access (non-blocking)
    const pathExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    // If the primary path doesn't exist, try alternative paths
    if (!(await pathExists(templatePath))) {
      const alternativePaths = [
        path.join(process.cwd(), "email", "templates", "generalTemplate.html"),
        path.join(__dirname, "../../../../../email", "templates", "generalTemplate.html"),
        path.join(__dirname, "../../../../email", "templates", "generalTemplate.html"),
      ];

      const results = await Promise.all(
        alternativePaths.map(async (p) => ({ path: p, exists: await pathExists(p) }))
      );

      const validPath = results.find(r => r.exists);
      if (validPath) {
        templatePath = validPath.path;
      }
    }

    // Read the template file
    const html = await fs.readFile(templatePath, "utf-8");

    return {
      html,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw createError({
        statusCode: 404,
        message: "Email wrapper template not found",
      });
    }
    throw createError({
      statusCode: 500,
      message: "Failed to read email wrapper template",
    });
  }
};
