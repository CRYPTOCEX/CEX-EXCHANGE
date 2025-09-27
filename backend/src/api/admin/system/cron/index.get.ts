// /server/api/cron/index.get.ts

import CronJobManager from "@b/utils/cron";

export const metadata: OperationObject = {
  summary: "Run the cron job",
  operationId: "runCron",
  tags: ["Admin", "Cron"],
  description: "Runs the cron job to process pending tasks.",
  responses: {
    200: {
      description: "Cron job run successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Error running cron job",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Error message",
              },
            },
          },
        },
      },
    },
  },
  permission: "view.cron",
};

export default async () => {
  const cronJobManager = await CronJobManager.getInstance();
  const cronJobs = await cronJobManager.getCronJobs();
  return cronJobs;
};
