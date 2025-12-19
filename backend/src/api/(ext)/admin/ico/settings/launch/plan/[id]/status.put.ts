import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Launch Plan Status",
  description:
    "Updates only the status field of a launch plan. Used to enable or disable plans for token offering creators.",
  operationId: "updateIcoLaunchPlanStatus",
  tags: ["Admin", "ICO", "Settings"],
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
  responses: {
    200: {
      description: "Launch plan status updated successfully",
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
  logTitle: "Update launch plan status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating status field");
  if (status === undefined) {
    ctx?.fail("Missing required field: status");
    throw createError({
      statusCode: 400,
      message: "Missing required field: status",
    });
  }

  ctx?.step("Updating launch plan status");
  const result = await updateRecord("icoLaunchPlan", id, { status });

  ctx?.success("Launch plan status updated successfully");
  return result;
};
