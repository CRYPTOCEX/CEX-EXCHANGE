import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of sliders",
  operationId: "bulkUpdateSliderStatus",
  tags: ["Admin", "Sliders"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of slider IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the sliders (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Slider"),
  requiresAuth: true,
  permission: "edit.slider",
  logModule: "ADMIN_CMS",
  logTitle: "Bulk update slider status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status of ${ids?.length || 0} slider(s) to ${status ? 'active' : 'inactive'}`);
  const result = await updateStatus("slider", ids, status);

  ctx?.success("Successfully updated slider status");
  return result;
};
