// /api/admin/mailwizard/campaigns/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  mailwizardCampaignStoreSchema,
  mailwizardCampaignUpdateSchema,
} from "./utils";

export const metadata = {
  summary: "Stores a new Mailwizard Campaign",
  operationId: "storeMailwizardCampaign",
  tags: ["Admin", "Mailwizard Campaigns"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: mailwizardCampaignUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    mailwizardCampaignStoreSchema,
    "Mailwizard Campaign"
  ),
  requiresAuth: true,
  permission: "create.mailwizard.campaign",
};

export default async (data: Handler) => {
  const { body } = data;
  const { name, subject, speed, templateId } = body;

  return await storeRecord({
    model: "mailwizardCampaign",
    data: {
      name,
      subject,
      status: "PENDING",
      speed,
      templateId,
    },
  });
};
