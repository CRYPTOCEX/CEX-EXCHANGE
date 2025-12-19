import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update merchant profile",
  description: "Updates the current user's merchant account details.",
  operationId: "updateMerchant",
  tags: ["Gateway", "Merchant"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            website: { type: "string", format: "uri" },
            description: { type: "string" },
            logo: { type: "string" },
            phone: { type: "string" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            country: { type: "string" },
            postalCode: { type: "string" },
            testMode: { type: "boolean" },
            allowedCurrencies: { type: "array", items: { type: "string" } },
            allowedWalletTypes: { type: "array", items: { type: "string" } },
            defaultCurrency: { type: "string" },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Merchant updated successfully",
    },
    404: {
      description: "Merchant not found",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Update Merchant Profile",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Unauthorized - no user ID");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Find merchant account");

  // Find merchant
  const merchant = await models.gatewayMerchant.findOne({
    where: { userId: user.id },
  });

  if (!merchant) {
    ctx?.fail("Merchant account not found");
    throw createError({
      statusCode: 404,
      message: "Merchant account not found",
    });
  }

  ctx?.step("Process field updates");

  // Fields that require re-verification if changed (locked when verified)
  const verifiedFields = [
    "name",
    "email",
    "phone",
    "website",
    "address",
    "city",
    "state",
    "country",
    "postalCode",
  ];

  // Fields that can always be updated
  const alwaysEditableFields = [
    "description",
    "logo",
    "testMode",
    "webhookUrl",
    "successUrl",
    "cancelUrl",
    "allowedCurrencies",
    "allowedWalletTypes",
    "defaultCurrency",
  ];

  const updates: Record<string, any> = {};

  // Check if fields are locked (PENDING or VERIFIED status)
  const isLocked = merchant.verificationStatus !== "UNVERIFIED";

  // Process always editable fields
  for (const field of alwaysEditableFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Process verified fields - only allow if UNVERIFIED
  for (const field of verifiedFields) {
    if (body[field] !== undefined) {
      if (isLocked && body[field] !== merchant[field]) {
        const statusMessage = merchant.verificationStatus === "VERIFIED"
          ? "Your account is verified."
          : "Your account is pending review.";
        throw createError({
          statusCode: 403,
          message: `Cannot update ${field}. ${statusMessage} Please contact support to request changes.`,
        });
      }
      updates[field] = body[field];
    }
  }

  ctx?.step("Validate currencies and wallet types");

  // Validate currencies and wallet types if provided
  if (updates.allowedCurrencies) {
    if (!Array.isArray(updates.allowedCurrencies)) {
      throw createError({
        statusCode: 400,
        message: "allowedCurrencies must be an array",
      });
    }
  }

  if (updates.allowedWalletTypes) {
    if (!Array.isArray(updates.allowedWalletTypes)) {
      throw createError({
        statusCode: 400,
        message: "allowedWalletTypes must be an array",
      });
    }
    const validTypes = ["FIAT", "SPOT", "ECO"];
    for (const type of updates.allowedWalletTypes) {
      if (!validTypes.includes(type)) {
        throw createError({
          statusCode: 400,
          message: `Invalid wallet type: ${type}`,
        });
      }
    }
  }

  ctx?.step("Update merchant record");

  // Update merchant
  await merchant.update(updates);

  ctx?.success("Merchant profile updated successfully");

  return {
    message: "Merchant updated successfully",
    merchant: {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      email: merchant.email,
      website: merchant.website,
      description: merchant.description,
      logo: merchant.logo,
      phone: merchant.phone,
      address: merchant.address,
      city: merchant.city,
      state: merchant.state,
      country: merchant.country,
      postalCode: merchant.postalCode,
      testMode: merchant.testMode,
      allowedCurrencies: merchant.allowedCurrencies,
      allowedWalletTypes: merchant.allowedWalletTypes,
      defaultCurrency: merchant.defaultCurrency,
      status: merchant.status,
      verificationStatus: merchant.verificationStatus,
      updatedAt: merchant.updatedAt,
    },
  };
};
