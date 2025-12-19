// /api/admin/system/cron/trigger.post.ts

import { createError } from "@b/utils/error";
import CronJobManager from "@b/cron";

export const metadata: OperationObject = {
  summary: "Manually trigger a cron job",
  operationId: "triggerCronJob",
  tags: ["Admin", "Cron"],
  description: "Manually triggers execution of a specific cron job for testing purposes.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            cronName: {
              type: "string",
              description: "The name of the cron job to trigger",
            },
          },
          required: ["cronName"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Cron job triggered successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "Whether the job was triggered successfully",
              },
              message: {
                type: "string",
                description: "Success or error message",
              },
              cronName: {
                type: "string",
                description: "The name of the triggered cron job",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad Request - Invalid cron job name or job is already running",
    },
    404: {
      description: "Cron job not found",
    },
    500: {
      description: "Internal server error during job execution",
    },
  },
  permission: "manage.cron",
  logModule: "ADMIN_SYS",
  logTitle: "Trigger cron job",
};

export default async (data: { body: { cronName: string }; ctx?: any }) => {
  const { cronName } = data.body;
  const { ctx } = data;

  if (!cronName || typeof cronName !== "string") {
    throw createError({
      statusCode: 400,
      message: "cronName is required and must be a string",
    });
  }

  try {
    ctx?.step("Validating cron job request");
    const cronJobManager = await CronJobManager.getInstance();
    const cronJobs = cronJobManager.getCronJobs();

    ctx?.step(`Checking if cron job '${cronName}' exists`);
    // Check if cron job exists
    const job = cronJobs.find((job) => job.name === cronName);
    if (!job) {
      ctx?.fail(`Cron job '${cronName}' not found`);
      throw createError({
        statusCode: 404,
        message: `Cron job '${cronName}' not found`,
      });
    }

    // Check if job is already running
    if (job.status === "running") {
      ctx?.warn(`Cron job '${cronName}' is already running`);
      throw createError({
        statusCode: 400,
        message: `Cron job '${cronName}' is already running`,
      });
    }

    ctx?.step(`Triggering cron job '${cronName}'`);
    // Trigger the job
    const success = await cronJobManager.triggerJob(cronName);

    if (success) {
      ctx?.success(`Cron job '${cronName}' triggered successfully`);
      return {
        success: true,
        message: `Cron job '${cronName}' triggered successfully`,
        cronName,
      };
    } else {
      ctx?.fail(`Failed to trigger cron job '${cronName}'`);
      throw createError({
        statusCode: 500,
        message: `Failed to trigger cron job '${cronName}'`,
      });
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    ctx?.fail(`Error triggering cron job: ${error.message}`);
    throw createError({
      statusCode: 500,
      message: `Error triggering cron job: ${error.message}`,
    });
  }
};