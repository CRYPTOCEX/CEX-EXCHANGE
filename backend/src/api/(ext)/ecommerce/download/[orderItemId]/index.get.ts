import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import path from "path";
import fs from "fs";
import { rateLimiters } from "@b/handler/Middleware";

export const metadata: OperationObject = {
  summary: "Download digital product file",
  description: "Provides download access to purchased digital products for authenticated users.",
  operationId: "downloadDigitalProduct",
  tags: ["Ecommerce", "Downloads"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "orderItemId",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Order item ID for the digital product to download",
    },
  ],
  responses: {
    200: {
      description: "Download URL or file content provided successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              downloadUrl: { type: "string" },
              fileName: { type: "string" },
              fileSize: { type: "number" },
              expiresAt: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Digital Product"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  // Apply rate limiting
  await rateLimiters.download(data);
  
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { orderItemId } = params;

  // Find the order item and verify ownership
  const orderItem = await models.ecommerceOrderItem.findOne({
    where: { id: orderItemId },
    include: [
      {
        model: models.ecommerceOrder,
        as: "order",
        where: { userId: user.id },
        attributes: ["id", "status", "userId"],
      },
      {
        model: models.ecommerceProduct,
        as: "product",
        attributes: ["id", "name", "type", "status"],
      },
    ],
  });

  if (!orderItem) {
    throw createError({ 
      statusCode: 404, 
      message: "Order item not found or access denied" 
    });
  }

  const orderItemData = orderItem.get({ plain: true }) as any;

  // Verify the order is completed
  if (orderItemData.order.status !== "COMPLETED") {
    throw createError({ 
      statusCode: 403, 
      message: "Order must be completed before downloading" 
    });
  }

  // Verify it's a downloadable product
  if (orderItemData.product.type !== "DOWNLOADABLE") {
    throw createError({ 
      statusCode: 400, 
      message: "This product is not downloadable" 
    });
  }

  // Check if product is still active
  if (!orderItemData.product.status) {
    throw createError({ 
      statusCode: 410, 
      message: "This product is no longer available for download" 
    });
  }

  // Check if download file exists
  if (!orderItemData.filePath) {
    throw createError({ 
      statusCode: 404, 
      message: "Download file not found" 
    });
  }

  try {
    // Define the uploads base directory
    const uploadsBaseDir = path.resolve(process.env.UPLOAD_DIR || './uploads/ecommerce/products');
    
    // Sanitize the file path to prevent path traversal
    const normalizedPath = path.normalize(orderItemData.filePath);
    const resolvedPath = path.resolve(uploadsBaseDir, normalizedPath);
    
    // Ensure the resolved path is within the uploads directory
    if (!resolvedPath.startsWith(uploadsBaseDir)) {
      throw createError({ 
        statusCode: 403, 
        message: "Access denied" 
      });
    }
    
    // Verify file exists
    if (!fs.existsSync(resolvedPath)) {
      throw createError({ 
        statusCode: 404, 
        message: "Download file not found on server" 
      });
    }

    const stats = fs.statSync(resolvedPath);
    const fileName = path.basename(resolvedPath);

    // Generate a temporary download URL (in a real implementation, you might use signed URLs)
    // For now, we'll return the file path and let the frontend handle the download
    const downloadUrl = `/api/ecommerce/download/${orderItemId}/file`;
    
    // Set expiration time (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      downloadUrl,
      fileName,
      fileSize: stats.size,
      expiresAt,
      key: orderItemData.key, // License key if available
    };

  } catch (error) {
    console.error("Download error:", error);
    throw createError({ 
      statusCode: 500, 
      message: "Error preparing download" 
    });
  }
}; 