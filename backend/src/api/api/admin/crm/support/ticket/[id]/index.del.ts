import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a support ticket",
  operationId: "deleteSupportTicket",
  tags: ["Admin", "CRM", "Support Ticket"],
  parameters: deleteRecordParams("support ticket"),
  responses: deleteRecordResponses("Support Ticket"),
  permission: "delete.support.ticket",
  requiresAuth: true,
};

export default async (data) => {
  const { params, query } = data;
  const { id } = params;

  await handleSingleDelete({
    model: "supportTicket",
    id,
    query,
  });

  return {
    message: "Ticket restored successfully",
  };
};
