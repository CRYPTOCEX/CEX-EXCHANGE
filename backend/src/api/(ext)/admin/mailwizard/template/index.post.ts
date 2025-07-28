// /api/admin/mailwizard/templates/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  mailwizardTemplateCreateSchema,
  mailwizardTemplateStoreSchema,
} from "./utils";

export const metadata = {
  summary: "Stores a new Mailwizard Template",
  operationId: "storeMailwizardTemplate",
  tags: ["Admin", "Mailwizard Templates"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mailwizardTemplateCreateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    mailwizardTemplateStoreSchema,
    "Mailwizard Template"
  ),
  requiresAuth: true,
  permission: "create.mailwizard.template",
};

export default async (data: Handler) => {
  const { body } = data;
  const { name } = body;

  return await storeRecord({
    model: "mailwizardTemplate",
    data: {
      name,
      content: "{}",
      design: "{}",
    },
  });
};
