import { createError } from "@b/utils/error";
import crypto from "crypto";
import OpenAI from "openai"; // For SumSub branch

export const metadata = {
  summary: "Check Verification Service Connection",
  description:
    "Checks the connection status with a specific verification service.",
  operationId: "checkVerificationServiceConnection",
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
      description: "Connection check completed.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              connected: {
                type: "boolean",
                description: "Whether the connection is successful",
              },
              message: {
                type: "string",
                description:
                  "Additional information about the connection status",
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
      return await checkSumSubConnection();
    } else if (id.startsWith("gemini")) {
      return await checkGeminiConnection(id);
    } else if (id.startsWith("deepseek")) {
      return await checkDeepSeekConnection();
    } else {
      throw createError({
        statusCode: 404,
        message: "Verification service not found",
      });
    }
  } catch (error: any) {
    console.error("Error in checkVerificationServiceConnection:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message:
        error.message || "Failed to check connection with verification service",
    });
  }
};

async function checkSumSubConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  const apiKey = process.env.SUMSUB_API_KEY;
  const apiSecret = process.env.SUMSUB_API_SECRET;

  if (!apiKey || !apiSecret) {
    return {
      connected: false,
      message:
        "Missing API credentials. Please configure SUMSUB_API_KEY and SUMSUB_API_SECRET.",
    };
  }

  try {
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(ts + "GET" + "/resources/checks")
      .digest("hex");

    const response = await fetch("https://api.sumsub.com/resources/checks", {
      method: "GET",
      headers: {
        "X-App-Token": apiKey,
        "X-App-Access-Sig": signature,
        "X-App-Access-Ts": ts,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return {
        connected: true,
        message: "Successfully connected to SumSub API",
      };
    } else {
      const errorData = (await response.json()) as { description?: string };
      return {
        connected: false,
        message: `SumSub connection failed: ${errorData.description || response.statusText}`,
      };
    }
  } catch (error: any) {
    return {
      connected: false,
      message: `SumSub connection error: ${error.message}`,
    };
  }
}

async function checkGeminiConnection(id): Promise<{
  connected: boolean;
  message: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      connected: false,
      message: "Missing API key. Please configure GEMINI_API_KEY.",
    };
  }

  try {
    // Dynamically import Gemini's SDK from @google/generative-ai.
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    // Select a Gemini model variant (adjust the model as needed).
    const model = genAI.getGenerativeModel({ model: id });
    // Make a minimal generateContent call to test connectivity.
    const generatedContent = await model.generateContent(["Test connection"]);
    if (generatedContent.response && generatedContent.response.text()) {
      return {
        connected: true,
        message: "Successfully connected to Gemini API",
      };
    } else {
      return {
        connected: false,
        message: "Gemini connection failed: No response received",
      };
    }
  } catch (error: any) {
    let errorMessage = "Gemini connection error";
    if (error.status === 401) {
      errorMessage = "Authentication failed - invalid API key";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded";
    } else if (error.status === 503) {
      errorMessage = "Gemini service unavailable";
    } else {
      errorMessage = `Gemini connection error: ${error.message}`;
    }
    return {
      connected: false,
      message: errorMessage,
    };
  }
}

async function checkDeepSeekConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return {
      connected: false,
      message: "Missing API key. Please configure DEEPSEEK_API_KEY.",
    };
  }

  try {
    // Test connection with a minimal API call
    const response = await fetch("https://api.deepseek.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return {
        connected: true,
        message: "Successfully connected to DeepSeek API",
      };
    } else {
      const errorData = await response.text();
      let errorMessage = "DeepSeek connection failed";
      
      if (response.status === 401) {
        errorMessage = "Authentication failed - invalid API key";
      } else if (response.status === 429) {
        // Rate limit means the API key is valid but we hit the limit
        return {
          connected: true,
          message: "API key is valid (rate limit reached, but connection successful)",
        };
      } else if (response.status === 503) {
        errorMessage = "DeepSeek service unavailable";
      } else {
        errorMessage = `DeepSeek connection failed: ${response.statusText}`;
      }
      
      return {
        connected: false,
        message: errorMessage,
      };
    }
  } catch (error: any) {
    return {
      connected: false,
      message: `DeepSeek connection error: ${error.message}`,
    };
  }
}
