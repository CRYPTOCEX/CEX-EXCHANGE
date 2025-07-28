import { createError } from "@b/utils/error";
import { unlockAddress } from "../../wallet/utils";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Unlocks a specific deposit address",
  description:
    "Allows administrative unlocking of a custodial wallet deposit address to make it available for reuse. This is typically used for NO_PERMIT token addresses that need to be released after deposit completion.",
  operationId: "unlockDepositAddress",
  tags: ["Wallet", "Deposit"],
  parameters: [
    {
      name: "address",
      in: "query",
      description: "The deposit address to unlock (must be a valid address format)",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Deposit address unlocked successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Success message indicating the address has been unlocked.",
              },
              address: {
                type: "string",
                description: "The address that was unlocked",
              },
              timestamp: {
                type: "string",
                description: "ISO timestamp of when the unlock occurred",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad request - invalid parameters",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              statusCode: { type: "number" }
            }
          }
        }
      }
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Address"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query, user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { address } = query;

  // Enhanced validation
  if (!address) {
    throw createError({ 
      statusCode: 400, 
      message: "Address parameter is required" 
    });
  }

  if (typeof address !== "string") {
    throw createError({ 
      statusCode: 400, 
      message: "Address must be a string" 
    });
  }

  // Basic address format validation
  const addressStr = address.trim();
  if (addressStr.length === 0) {
    throw createError({ 
      statusCode: 400, 
      message: "Address cannot be empty" 
    });
  }

  // Validate address format (basic check for common formats)
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(addressStr) || // Ethereum format
                        /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addressStr) || // Bitcoin legacy
                        /^bc1[a-z0-9]{39,59}$/.test(addressStr) || // Bitcoin bech32
                        /^[A-Z0-9]{26,35}$/.test(addressStr); // Generic alphanumeric (for other chains)

  if (!isValidAddress) {
    throw createError({ 
      statusCode: 400, 
      message: "Invalid address format" 
    });
  }

  try {
    console.log(`[INFO] Attempting to unlock address ${addressStr} for user ${user.id}`);
    
    await unlockAddress(addressStr);
    
    const timestamp = new Date().toISOString();
    console.log(`[SUCCESS] Address ${addressStr} unlocked successfully at ${timestamp}`);
    
    return { 
      message: "Address unlocked successfully",
      address: addressStr,
      timestamp 
    };
  } catch (error) {
    console.error(`[ERROR] Failed to unlock address ${addressStr}: ${error.message}`);
    
    throw createError({
      statusCode: 500,
      message: `Failed to unlock address: ${error.message}`
    });
  }
};
