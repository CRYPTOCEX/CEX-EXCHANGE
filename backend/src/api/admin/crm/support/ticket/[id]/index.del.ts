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
  logModule: "ADMIN_SUP",
  logTitle: "Delete ticket",
};

export default async (data) => {
  const { params, query, ctx } = data;
  const { id } = params;

  ctx?.step("Deleting ticket");
  await handleSingleDelete({
    model: "supportTicket",
    id,
    query,
  });

  ctx?.success("Ticket deleted successfully");
  return {
    message: "Ticket restored successfully",
  };
};
