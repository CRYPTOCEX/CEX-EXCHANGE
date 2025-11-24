import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { rateLimiters } from "@b/handler/Middleware";

export const metadata: OperationObject = {
  summary: "Stream digital product file",
  description: "Streams the actual file content for purchased digital products",
  operationId: "streamDigitalProductFile",
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
      description: "File streamed successfully",
      content: {
        "application/octet-stream": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Digital Product File"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler & { res?: any }) => {
  // Apply rate limiting
  await rateLimiters.download(data);
  
  const { user, params } = data;
  const { res } = data as any; // res is provided by the framework at runtime
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
    // Define the uploads base directory (should be configured in environment)
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
    
    // Set response headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size.toString());
    
    // Stream the file
    const readStream = fs.createReadStream(resolvedPath);
    await pipeline(readStream, res);
    
    // Log download activity
    await models.ecommerceOrderItem.update(
      { 
        updatedAt: new Date(),
        // You could add a download counter here if needed
      },
      { where: { id: orderItemId } }
    );

  } catch (error) {
    console.error("File streaming error:", error);
    if (!res.headersSent) {
      throw createError({ 
        statusCode: 500, 
        message: "Error streaming file" 
      });
    }
  }
};