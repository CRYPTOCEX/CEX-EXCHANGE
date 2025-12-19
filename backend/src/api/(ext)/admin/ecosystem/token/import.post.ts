import {
  storeRecord,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import {
  badRequestResponse,
  conflictResponse,
} from "@b/utils/schema/errors";
import { ecosystemTokenImportSchema, updateIconInCache } from "./utils";

export const metadata: OperationObject = {
  summary: "Imports an existing ecosystem token",
  description:
    "Imports an existing token by providing contract details, network information, and token metadata. This endpoint is used to add already-deployed tokens to the platform without deploying a new contract.",
  operationId: "importEcosystemToken",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Import token",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecosystemTokenImportSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Ecosystem token imported successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              record: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Token ID" },
                  contract: { type: "string", description: "Contract address" },
                  name: { type: "string", description: "Token name" },
                  currency: { type: "string", description: "Token currency symbol" },
                  chain: { type: "string", description: "Blockchain chain" },
                  network: { type: "string", description: "Network type" },
                  type: { type: "string", description: "Token type" },
                  decimals: { type: "number", description: "Token decimals" },
                  contractType: {
                    type: "string",
                    enum: ["PERMIT", "NO_PERMIT", "NATIVE"],
                    description: "Contract type",
                  },
                  status: { type: "boolean", description: "Token status" },
                },
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    409: conflictResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "create.ecosystem.token",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const {
    icon,
    name,
    currency,
    chain,
    network,
    contract,
    contractType,
    decimals,
    precision,
    type,
    fee,
    limits,
    status,
  } = body;

  try {
    ctx?.step("Sanitizing token data");
    // Stringify JSON fields if necessary
    const sanitizedData = {
      icon,
      name,
      currency,
      chain,
      network,
      contract,
      contractType,
      decimals,
      precision,
      type,
      fee: typeof fee === "object" ? JSON.stringify(fee) : fee,
      limits: typeof limits === "object" ? JSON.stringify(limits) : limits,
      status,
    };

    ctx?.step("Importing token to database");
    const result = await storeRecord({
      model: "ecosystemToken",
      data: sanitizedData,
      returnResponse: true,
    });

    // If the import was successful and an icon was provided, update the cache
    if (result.record && icon) {
      try {
        await updateIconInCache(currency, icon, ctx);
      } catch (error) {
        ctx?.warn(`Failed to update icon in cache: ${error.message}`);
        console.error(`Failed to update icon in cache for ${currency}:`, error);
        // Note: We don't throw this error as it shouldn't affect the main operation
      }
    }

    ctx?.success(`Token ${currency} imported successfully`);
    return result;
  } catch (error) {
    ctx?.fail(error.message);
    console.error(`Error importing ecosystem token:`, error);

    // Provide a more descriptive error message for debugging
    if (error.name === "SequelizeValidationError") {
      console.error("Validation failed for one or more fields.");
    } else if (error.name === "SequelizeDatabaseError") {
      console.error("Database error occurred.");
    }

    throw error;
  }
};
