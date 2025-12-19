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
  logModule: "ADMIN_CMS",
  logTitle: "Bulk delete media files",
};

export default async (data: any) => {
  const { body, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating image IDs");
  if (!ids || ids.length === 0) {
    ctx?.fail("No image IDs provided");
    throw new Error("Image ids are required");
  }

  ctx?.step(`Deleting ${ids.length} image file(s)`);
  for (const imagePath of ids) {
    try {
      const fullPath = join(publicDirectory, imagePath.replace(/_/g, "/"));
      await fs.unlink(fullPath);
      filterMediaCache("/uploads" + imagePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        ctx?.fail("Image file not found");
        throw new Error("Image file not found");
      } else if (error.code === "EBUSY") {
        ctx?.fail("File is busy or locked");
        throw new Error("File is busy or locked");
      } else {
        ctx?.fail("Failed to delete image file");
        throw new Error("Failed to delete image file");
      }
    }
  }

  ctx?.success(`Successfully deleted ${ids.length} image file(s)`);
  return { message: "Image files deleted successfully" };
};
