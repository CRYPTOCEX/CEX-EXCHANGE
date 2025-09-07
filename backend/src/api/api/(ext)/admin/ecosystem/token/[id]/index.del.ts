// /server/api/ecosystem/tokens/delete/[id].del.ts

import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes an ecosystem token",
  operationId: "deleteEcosystemToken",
  tags: ["Admin", "Ecosystem", "Tokens"],
  parameters: deleteRecordParams("ecosystem token"),
  responses: deleteRecordResponses("Ecosystem token"),
  requiresAuth: true,
  permission: "delete.ecosystem.token",
};

export default async (data: Handler) => {
  const { params, query } = data;

  return handleSingleDelete({
    model: "ecosystemToken",
    id: params.id,
    query,
  });
};
