import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Mailwizard campaign",
  operationId: "deleteMailwizardCampaign",
  tags: ["Admin","Mailwizard", "Campaigns"],
  parameters: deleteRecordParams("Mailwizard campaign"),
  responses: deleteRecordResponses("Mailwizard campaign"),
  permission: "delete.mailwizard.campaign",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "mailwizardCampaign",
    id: params.id,
    query,
  });
};
