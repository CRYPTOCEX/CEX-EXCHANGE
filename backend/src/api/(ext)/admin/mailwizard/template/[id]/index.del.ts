import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Mailwizard template",
  operationId: "deleteMailwizardTemplate",
  tags: ["Admin", "Mailwizard", "Templates"],
  parameters: deleteRecordParams("Mailwizard template"),
  responses: deleteRecordResponses("Mailwizard template"),
  permission: "delete.mailwizard.template",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "mailwizardTemplate",
    id: params.id,
    query,
  });
};
