import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { rateLimiters } from "@b/handler/Middleware";

export const metadata: OperationObject = {
  summary: "Validate discount code",
  description: "Validates a discount code and returns discount information if valid.",
  operationId: "validateDiscountCode",
  tags: ["Ecommerce", "Discounts"],
  requiresAuth: true,
  logModule: "ECOM",
  logTitle: "Validate discount code",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Discount code to validate",
            },
          },
          required: ["code"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Discount code validation result",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              code: { type: "string" },
              type: { type: "string", enum: ["PERCENTAGE", "FIXED", "FREE_SHIPPING"] },
              value: { type: "number" },
              message: { type: "string" },
              isValid: { type: "boolean" },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid or expired discount code",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              isValid: { type: "boolean" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Discount"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  // Apply rate limiting
  await rateLimiters.discountValidation(data);
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { code } = body;

  ctx?.step("Validating discount code format");
  if (!code || typeof code !== "string") {
    throw createError({
      statusCode: 400,
      message: "Discount code is required"
    });
  }

  try {
    ctx?.step("Looking up discount code");
    // Find the discount by code
    const discount = await models.ecommerceDiscount.findOne({
      where: {
        code: code.toUpperCase().trim(),
        status: true, // Only active discounts
      },
    });

    if (!discount) {
      ctx?.fail("Invalid discount code");
      return {
        error: "Invalid discount code",
        isValid: false,
      };
    }

    const discountData = discount.get({ plain: true }) as any;
    const now = new Date();

    ctx?.step("Checking discount validity dates");
    // Check if discount is still valid (not expired)
    if (discountData.validUntil && new Date(discountData.validUntil) < now) {
      ctx?.fail("Discount code has expired");
      return {
        error: "This discount code has expired",
        isValid: false,
      };
    }

    // Check if discount hasn't started yet
    if (discountData.validFrom && new Date(discountData.validFrom) > now) {
      ctx?.fail("Discount code is not yet active");
      return {
        error: "This discount code is not yet active",
        isValid: false,
      };
    }

    ctx?.step("Checking user usage history");
    // Check if user has already used this discount (if it's single-use)
    if (discountData.maxUses === 1) {
      const existingUse = await models.ecommerceUserDiscount.findOne({
        where: {
          userId: user.id,
          discountId: discountData.id,
        },
      });

      if (existingUse) {
        ctx?.fail("User has already used this discount code");
        return {
          error: "You have already used this discount code",
          isValid: false,
        };
      }
    }

    ctx?.step("Checking usage limits");
    // Check if discount has reached maximum uses
    if (discountData.maxUses && discountData.maxUses > 0) {
      const usageCount = await models.ecommerceUserDiscount.count({
        where: {
          discountId: discountData.id,
        },
      });

      if (usageCount >= discountData.maxUses) {
        ctx?.fail("Discount code has reached usage limit");
        return {
          error: "This discount code has reached its usage limit",
          isValid: false,
        };
      }
    }

    // Generate success message based on discount type
    let message = "";
    switch (discountData.type) {
      case "PERCENTAGE":
        message = `${discountData.percentage}% discount applied!`;
        break;
      case "FIXED":
        message = `$${discountData.amount} discount applied!`;
        break;
      case "FREE_SHIPPING":
        message = "Free shipping applied!";
        break;
      default:
        message = "Discount applied successfully!";
    }

    ctx?.step("Creating user discount record");
    // Create user discount record to track usage
    await models.ecommerceUserDiscount.create({
      userId: user.id,
      discountId: discountData.id,
    });

    ctx?.success(`Discount code "${discountData.code}" validated successfully`);

    return {
      id: discountData.id,
      code: discountData.code,
      type: discountData.type,
      value: discountData.type === "PERCENTAGE" ? discountData.percentage : discountData.amount,
      message,
      isValid: true,
    };

  } catch (error) {
    console.error("Discount validation error:", error);
    throw createError({
      statusCode: 500,
      message: "Error validating discount code"
    });
  }
}; 