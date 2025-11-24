import { createError } from "@b/utils/error";

async function checkSumSubEnv(): Promise<{
  success: boolean;
  missingEnvVars: string[];
}> {
  const requiredVars = {
    SUMSUB_API_KEY: process.env.SUMSUB_API_KEY,
    SUMSUB_API_SECRET: process.env.SUMSUB_API_SECRET,
  };

  const missingEnvVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    return {
      success: false,
      missingEnvVars,
    };
  }

  return {
    success: true,
    missingEnvVars: [],
  };
}

async function checkGeminiEnv(): Promise<{
  success: boolean;
  missingEnvVars: string[];
}> {
  const requiredVars = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  const missingEnvVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    return {
      success: false,
      missingEnvVars,
    };
  }

  return {
    success: true,
    missingEnvVars: [],
  };
}

async function checkDeepSeekEnv(): Promise<{
  success: boolean;
  missingEnvVars: string[];
}> {
  const requiredVars = {
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  };

  const missingEnvVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingEnvVars.length > 0) {
    return {
      success: false,
      missingEnvVars,
    };
  }

  return {
    success: true,
    missingEnvVars: [],
  };
}

export const metadata = {
  summary: "Check Verification Service Environment Variables",
  description:
    "Checks if the required environment variables for a verification service are configured.",
  operationId: "checkVerificationServiceEnv",
  tags: ["KYC", "Verification Services"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Verification service ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Environment variable check completed.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description:
                  "Whether all required environment variables are present",
              },
              missingEnvVars: {
                type: "array",
                items: { type: "string" },
                description: "List of missing environment variables",
              },
            },
          },
        },
      },
    },
    404: { description: "Verification service not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params: { id: string } }): Promise<any> => {
  try {
    const { id } = data.params;

    if (id.startsWith("sumsub")) {
      return await checkSumSubEnv();
    } else if (id.startsWith("gemini")) {
      return await checkGeminiEnv();
    } else if (id.startsWith("deepseek")) {
      return await checkDeepSeekEnv();
    } else {
      throw createError({
        statusCode: 404,
        message: "Verification service not found",
      });
    }
  } catch (error: any) {
    console.error("Error in checkVerificationServiceEnv:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message:
        error.message ||
        "Failed to check environment variables for verification service",
    });
  }
};
