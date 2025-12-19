import { updateRecordResponses, updateRecord } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Reorder ICO Launch Plans",
  description:
    "Bulk updates the sort order for launch plans. Accepts an array of objects with plan IDs and their new sortOrder values to reposition plans in the display sequence.",
  operationId: "reorderIcoLaunchPlans",
  tags: ["Admin", "ICO", "Settings"],
  requestBody: {
    description: "Array of launch plans with new sortOrder values",
    content: {
      "application/json": {
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              sortOrder: { type: "number" },
            },
            required: ["id", "sortOrder"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Launch plans reordered successfully",
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
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Reorder launch plans",
};

export default async (data: Handler) => {
  const { body, ctx } = data;

  ctx?.step("Validating request body");
  if (!Array.isArray(body)) {
    ctx?.fail("Invalid request body format");
    throw createError({
      statusCode: 400,
      message: "Request body must be an array of launch plans",
    });
  }

  ctx?.step(`Reordering ${body.length} launch plans`);
  // Update each plan's sortOrder.
  const updatePromises = body.map((plan: any) => {
    if (!plan.id || typeof plan.sortOrder !== "number") {
      return Promise.resolve();
    }
    return updateRecord("icoLaunchPlan", plan.id, {
      sortOrder: plan.sortOrder,
    });
  });

  await Promise.all(updatePromises);

  ctx?.success("Launch plans reordered successfully");
  return { message: "Launch plans reordered successfully" };
};
