import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Set Recommended ICO Launch Plan",
  description:
    "Updates the recommended flag for a launch plan. When setting recommended to true, automatically clears the flag from all other plans to ensure only one plan is recommended at a time.",
  operationId: "setRecommendedIcoLaunchPlan",
  tags: ["Admin", "ICO", "Settings"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the launch plan to update recommended flag",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Request body must contain the recommended flag",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            recommended: {
              type: "boolean",
              description:
                "Recommended flag. When true, this plan will be the only recommended plan; when false, this plan will be marked as not recommended",
            },
          },
          required: ["recommended"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Launch plan recommended status updated successfully",
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
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Launch Plan"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Set recommended launch plan",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { recommended } = body;

  ctx?.step("Validating recommended flag");
  if (typeof recommended !== "boolean") {
    ctx?.fail("Invalid recommended flag type");
    throw createError({
      statusCode: 400,
      message: "The recommended flag must be a boolean",
    });
  }

  if (recommended) {
    ctx?.step("Clearing existing recommended plans");
    // Find all launch plans that are currently recommended (true) and update them to false.
    const recommendedPlans = await models.icoLaunchPlan.findAll({
      where: { recommended: true },
    });
    await Promise.all(
      recommendedPlans.map((plan: any) =>
        updateRecord("icoLaunchPlan", plan.id, { recommended: false })
      )
    );
  }

  ctx?.step("Setting recommended flag");
  const result = await updateRecord("icoLaunchPlan", id, { recommended });

  ctx?.success("Launch plan recommended flag updated successfully");
  return result;
};
