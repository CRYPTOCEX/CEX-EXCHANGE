import { promises as fs } from "fs";
import { join } from "path";
import { filterMediaCache, publicDirectory } from "./utils";

export const metadata: OperationObject = {
  summary: "Bulk deletes image files by ids",
  operationId: "bulkDeleteImageFiles",
  tags: ["Admin", "Content", "Media"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of image file ids to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Image files deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: { description: "Bad request if ids are not specified" },
    404: { description: "Not found if some image files do not exist" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "delete.content.media",
};

export default async (data: any) => {
  const { body } = data;
  const { ids } = body;

  if (!ids || ids.length === 0) {
    throw new Error("Image ids are required");
  }

  for (const imagePath of ids) {
    try {
      const fullPath = join(publicDirectory, imagePath.replace(/_/g, "/"));
      await fs.unlink(fullPath);
      filterMediaCache("/uploads" + imagePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Image file not found");
      } else if (error.code === "EBUSY") {
        throw new Error("File is busy or locked");
      } else {
        throw new Error("Failed to delete image file");
      }
    }
  }

  return { message: "Image files deleted successfully" };
};
