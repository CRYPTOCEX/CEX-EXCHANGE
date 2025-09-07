import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata = {
  summary: "Set Recommended Launch Plan",
  description:
    "Updates the recommended flag for a launch plan. When setting recommended to true, it clears the flag from all launch plans that are currently true so that only one plan is recommended. When setting it to false, only that plan is updated.",
  operationId: "setRecommendedLaunchPlan",
  tags: ["ICO", "Admin", "LaunchPlans"],
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
    description: "Request body must contain the recommended flag.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            recommended: {
              type: "boolean",
              description:
                "Recommended flag. When true, this plan will be the only recommended plan; when false, this plan will be marked as not recommended.",
            },
          },
          required: ["recommended"],
        },
      },
    },
  },
  responses: updateRecordResponses("Launch Plan Recommended"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { recommended } = body;

  if (typeof recommended !== "boolean") {
    throw createError({
      statusCode: 400,
      message: "The recommended flag must be a boolean",
    });
  }

  if (recommended) {
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

  // Finally, update the specified plan with the requested recommended flag.
  return await updateRecord("icoLaunchPlan", id, { recommended });
};
