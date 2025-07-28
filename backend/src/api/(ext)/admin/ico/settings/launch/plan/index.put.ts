import { updateRecordResponses, updateRecord } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Reorder Launch Plans",
  description:
    "Bulk updates the sortOrder for launch plans. Expects an array of objects with each plan's id and updated sortOrder.",
  operationId: "reorderLaunchPlans",
  tags: ["ICO", "Admin", "LaunchPlans"],
  requestBody: {
    description: "Array of launch plans with new sortOrder values.",
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
  responses: updateRecordResponses("Launch Plans Reordered"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body } = data;
  if (!Array.isArray(body)) {
    throw createError({
      statusCode: 400,
      message: "Request body must be an array of launch plans",
    });
  }

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
  return { message: "Launch plans reordered successfully" };
};
