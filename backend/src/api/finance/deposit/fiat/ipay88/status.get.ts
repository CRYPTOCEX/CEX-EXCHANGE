import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  getIpay88Config,
  makeIpay88Request,
  generateIpay88Signature,
  verifyIpay88Signature,
  convertFromIpay88Amount,
  IPAY88_STATUS_MAPPING,
  IPAY88_RESPONSE_CODES,
  Ipay88QueryRequest,
  Ipay88QueryResponse,
  Ipay88Error
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Checks iPay88 payment status",
  description:
    "Queries iPay88 for the current status of a payment transaction using the reference number. This endpoint can be used to check payment status when webhook notifications are not received.",
  operationId: "checkIpay88PaymentStatus",
  tags: ["Finance", "Payment"],
  parameters: [
    {
      name: "reference",
      in: "query",
      required: true,
      schema: {
        type: "string",
      },
      description: "Transaction reference number",
    },
    {
      name: "amount",
      in: "query",
      required: true,
      schema: {
        type: "number",
      },
      description: "Transaction amount",
    },
    {
      name: "currency",
      in: "query",
      required: true,
      schema: {
        type: "string",
      },
      description: "Transaction currency",
    },
  ],
  responses: {
    200: {
      description: "Payment status retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  transaction_id: { type: "string" },
                  reference: { type: "string" },
                  status: { type: "string" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  gateway: { type: "string" },
                  ipay88_transaction_id: { type: "string" },
                  auth_code: { type: "string" },
                  response_message: { type: "string" },
                  payment_method: { type: "string" },
                  signature_valid: { type: "boolean" },
                  last_updated: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad request - Invalid parameters",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string" },
              details: { type: "object" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transaction not found"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;

  if (!user) {
    throw new Error("User not found");
  }

  try {
    const { reference, amount, currency } = query;

    // Validate required parameters
    if (!reference) {
      throw new Error("Reference number is required");
    }

    if (!amount || isNaN(Number(amount))) {
      throw new Error("Valid amount is required");
    }

    if (!currency) {
      throw new Error("Currency is required");
    }

    // Get iPay88 configuration
    const config = getIpay88Config();

    // Find transaction by reference number
    const transaction = await models.transaction.findOne({
      where: {
        userId: user.id,
        metadata: {
          ipay88_reference: reference,
        },
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${reference}`);
    }

    // Convert amount to iPay88 format for signature
    const ipay88Amount = Math.round(Number(amount) * 100).toString();

    // Generate signature for requery request
    const signature = generateIpay88Signature(
      config.merchantKey,
      config.merchantCode,
      reference,
      ipay88Amount,
      currency.toUpperCase()
    );

    // Prepare requery request
    const requeryRequest: Ipay88QueryRequest = {
      MerchantCode: config.merchantCode,
      RefNo: reference,
      Amount: ipay88Amount,
      Currency: currency.toUpperCase(),
      Signature: signature,
    };

    try {
      // Make requery request to iPay88
      const response = await makeIpay88Request("/api/requery.asp", "POST", requeryRequest);

      // Parse response (iPay88 returns URL-encoded string)
      const responseParams = new URLSearchParams(response);
      const requeryResponse: Ipay88QueryResponse = {
        MerchantCode: responseParams.get("MerchantCode") || "",
        PaymentId: responseParams.get("PaymentId") || "",
        RefNo: responseParams.get("RefNo") || "",
        Amount: responseParams.get("Amount") || "",
        Currency: responseParams.get("Currency") || "",
        Remark: responseParams.get("Remark") || "",
        TransId: responseParams.get("TransId") || "",
        AuthCode: responseParams.get("AuthCode") || "",
        Status: responseParams.get("Status") || "",
        ErrDesc: responseParams.get("ErrDesc") || "",
        Signature: responseParams.get("Signature") || "",
        CCName: responseParams.get("CCName") || undefined,
        CCNo: responseParams.get("CCNo") || undefined,
        S_bankname: responseParams.get("S_bankname") || undefined,
        S_country: responseParams.get("S_country") || undefined,
      };

      // Verify response signature
      const isSignatureValid = verifyIpay88Signature(
        config.merchantKey,
        requeryResponse.MerchantCode,
        requeryResponse.PaymentId,
        requeryResponse.RefNo,
        requeryResponse.Amount,
        requeryResponse.Currency,
        requeryResponse.Status,
        requeryResponse.Signature
      );

      if (!isSignatureValid) {
        console.error("iPay88 requery response signature verification failed", {
          reference: reference,
          response: requeryResponse,
        });
        
        throw new Error("Invalid signature in iPay88 response");
      }

      // Convert amount back to decimal
      const actualAmount = convertFromIpay88Amount(requeryResponse.Amount);

      // Map iPay88 status to our status
      const mappedStatus = IPAY88_STATUS_MAPPING[requeryResponse.Status] || "FAILED";

      // Update transaction with latest status if different
      if (transaction.status !== mappedStatus) {
        const updateData: any = {
          status: mappedStatus,
          metadata: {
            ...transaction.metadata,
            ipay88_transaction_id: requeryResponse.TransId,
            ipay88_auth_code: requeryResponse.AuthCode,
            ipay88_status: requeryResponse.Status,
            ipay88_error_desc: requeryResponse.ErrDesc,
            ipay88_remark: requeryResponse.Remark,
            signature_valid: true,
            ipay88_requery_response: requeryResponse,
            last_status_check: new Date().toISOString(),
          },
        };

        // Add payment method information if available
        if (requeryResponse.CCName || requeryResponse.CCNo) {
          updateData.metadata.payment_method_details = {
            type: "credit_card",
            card_holder: requeryResponse.CCName,
            masked_number: requeryResponse.CCNo,
          };
        } else if (requeryResponse.S_bankname) {
          updateData.metadata.payment_method_details = {
            type: "online_banking",
            bank_name: requeryResponse.S_bankname,
            country: requeryResponse.S_country,
          };
        }

        // If payment is successful and not already processed, update user wallet
        if (mappedStatus === "COMPLETED" && transaction.status !== "COMPLETED") {
          const wallet = await models.wallet.findOne({
            where: { userId: transaction.userId, currency: transaction.metadata.currency },
          });

          if (wallet) {
            await wallet.update({
              balance: wallet.balance + transaction.amount,
            });
          } else {
            await models.wallet.create({
              userId: transaction.userId,
              type: "FIAT",
              currency: transaction.metadata.currency,
              balance: transaction.amount,
            });
          }

          updateData.metadata.wallet_updated = true;
          updateData.metadata.wallet_updated_at = new Date().toISOString();
        }

        await transaction.update(updateData);
      }

      // Get response message
      const responseMessage = IPAY88_RESPONSE_CODES[requeryResponse.AuthCode] || requeryResponse.ErrDesc || "Unknown response";

      return {
        success: true,
        data: {
          transaction_id: transaction.id,
          reference: requeryResponse.RefNo,
          status: mappedStatus,
          amount: actualAmount,
          currency: requeryResponse.Currency,
          gateway: "ipay88",
          ipay88_transaction_id: requeryResponse.TransId,
          auth_code: requeryResponse.AuthCode,
          response_message: responseMessage,
          payment_method: transaction.metadata.payment_method_details?.type || "unknown",
          signature_valid: true,
          last_updated: transaction.updatedAt,
          requery_timestamp: new Date().toISOString(),
        },
      };

    } catch (requeryError) {
      // If requery fails, return current transaction status
      console.warn("iPay88 requery failed, returning current transaction status:", requeryError.message);

      return {
        success: true,
        data: {
          transaction_id: transaction.id,
          reference: reference,
          status: transaction.status,
          amount: transaction.amount,
          currency: transaction.metadata.currency,
          gateway: "ipay88",
          ipay88_transaction_id: transaction.metadata.ipay88_transaction_id || "",
          auth_code: transaction.metadata.ipay88_auth_code || "",
          response_message: "Status check from local database (requery unavailable)",
          payment_method: transaction.metadata.payment_method_details?.type || "unknown",
          signature_valid: transaction.metadata.signature_valid || false,
          last_updated: transaction.updatedAt,
          requery_error: requeryError.message,
        },
      };
    }

  } catch (error) {
    console.error("iPay88 status check error:", error);
    
    if (error instanceof Ipay88Error) {
      throw new Error(`iPay88 Error: ${error.message}`);
    }
    
    throw new Error(error.message || "Failed to check iPay88 payment status");
  }
}; 