import { promises as fs } from "fs";
import { join, sep } from "path";
import { filterMediaCache, publicDirectory } from "../utils";
import { sanitizePath } from "@b/utils/validation";

export const metadata: OperationObject = {
  summary: "Deletes an image file by id",
  operationId: "deleteImageFile",
  tags: ["Admin", "Content", "Media"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The relative id of the image file to delete",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Image file deleted successfully",
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
    400: { description: "Bad request if the id is not specified" },
    404: { description: "Not found if the image file does not exist" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "delete.content.media",
  logModule: "ADMIN_CMS",
  logTitle: "Delete media file",
};

export default async (data: any) => {
  const { params, ctx } = data;
  const imagePath = params.id;

  ctx?.step("Validating image ID");
  if (!imagePath) {
    ctx?.fail("Image ID is required");
    throw new Error("Image id is required");
  }

  // Sanitize the image path to prevent LFI
  ctx?.step("Sanitizing file path");
  const sanitizedPath = sanitizePath(imagePath.replace(/_/g, sep));
  const fullPath = join(publicDirectory, sanitizedPath);

  try {
    ctx?.step("Deleting image file");
    await fs.unlink(fullPath);
    filterMediaCache(sanitizedPath);

    ctx?.success("Image file deleted successfully");
    return { message: "Image file deleted successfully" };
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
};
