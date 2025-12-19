import { deleteRecordParams, handleSingleDelete } from "@b/utils/query";
import { deleteResponses } from "@b/utils/schema/errors";

export const metadata = {
  summary: "Delete a Mailwizard template",
  operationId: "deleteMailwizardTemplate",
  tags: ["Admin", "Mailwizard", "Templates"],
  description:
    "Permanently deletes a specific Mailwizard template by ID. This operation cannot be undone. Templates that are currently in use by active campaigns cannot be deleted.",
  parameters: deleteRecordParams("Mailwizard template"),
  responses: deleteResponses("Mailwizard Template"),
  permission: "delete.mailwizard.template",
  requiresAuth: true,
  logModule: "ADMIN_MAIL",
  logTitle: "Delete template",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting template");
  const result = await handleSingleDelete({
    model: "mailwizardTemplate",
    id: params.id,
    query,
  });

  ctx?.success("Template deleted successfully");
  return result;
};
