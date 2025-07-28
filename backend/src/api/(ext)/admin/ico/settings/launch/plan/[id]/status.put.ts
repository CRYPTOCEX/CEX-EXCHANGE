import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update Launch Plan Status",
  description:
    "Updates only the status of a launch plan configuration for ICO admin.",
  operationId: "updateLaunchPlanStatus",
  tags: ["ICO", "Admin", "LaunchPlans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the launch plan to update status",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New status for the launch plan",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: { type: "boolean", description: "Plan status" },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Launch Plan Status"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;

  if (status === undefined) {
    throw createError({
      statusCode: 400,
      message: "Missing required field: status",
    });
  }

  return await updateRecord("icoLaunchPlan", id, { status });
};
