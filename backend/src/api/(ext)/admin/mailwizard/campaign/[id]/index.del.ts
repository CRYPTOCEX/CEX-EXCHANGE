import { deleteRecordParams, handleSingleDelete } from "@b/utils/query";
import { deleteResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Delete a Mailwizard campaign",
  operationId: "deleteMailwizardCampaign",
  tags: ["Admin", "Mailwizard", "Campaigns"],
  description:
    "Permanently deletes a specific Mailwizard campaign by ID. This operation cannot be undone and will remove all campaign data including targets and execution history.",
  parameters: deleteRecordParams("Mailwizard campaign"),
  responses: deleteResponses("Mailwizard Campaign"),
  permission: "delete.mailwizard.campaign",
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Delete campaign",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting campaign");
  const result = await handleSingleDelete({
    model: "mailwizardCampaign",
    id: params.id,
    query,
  });

  ctx?.success("Campaign deleted successfully");
  return result;
};
