import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { ecosystemTokenImportSchema, updateIconInCache } from "./utils";

export const metadata: OperationObject = {
  summary: "Imports a new Ecosystem Token",
  operationId: "importEcosystemToken",
  tags: ["Admin", "Ecosystem Tokens"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecosystemTokenImportSchema,
      },
    },
  },
  responses: storeRecordResponses(
    ecosystemTokenImportSchema,
    "Ecosystem Token"
  ),
  requiresAuth: true,
  permission: "create.ecosystem.token",
};

export default async (data: Handler) => {
  const { body } = data;
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

    const result = await storeRecord({
      model: "ecosystemToken",
      data: sanitizedData,
      returnResponse: true,
    });

    // If the import was successful and an icon was provided, update the cache
    if (result.record && icon) {
      try {
        await updateIconInCache(currency, icon);
      } catch (error) {
        console.error(`Failed to update icon in cache for ${currency}:`, error);
        // Note: We don't throw this error as it shouldn't affect the main operation
      }
    }

    return result;
  } catch (error) {
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
