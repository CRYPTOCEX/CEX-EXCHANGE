import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  getIpay88Config,
  verifyIpay88Signature,
  convertFromIpay88Amount,
  IPAY88_STATUS_MAPPING,
  IPAY88_RESPONSE_CODES,
  Ipay88Error
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Verifies iPay88 payment status",
  description:
    "Handles iPay88 payment verification from return URL. This endpoint processes the payment response from iPay88 and updates the transaction status accordingly.",
  operationId: "verifyIpay88Payment",
  tags: ["Finance", "Payment"],
  requestBody: {
    description: "iPay88 payment response data",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            MerchantCode: {
              type: "string",
              description: "iPay88 merchant code",
            },
            PaymentId: {
              type: "string",
              description: "Payment ID",
            },
            RefNo: {
              type: "string",
              description: "Reference number",
            },
            Amount: {
              type: "string",
              description: "Payment amount in cents",
            },
            Currency: {
              type: "string",
              description: "Currency code",
            },
            Remark: {
              type: "string",
              description: "Payment remark",
            },
            TransId: {
              type: "string",
              description: "iPay88 transaction ID",
            },
            AuthCode: {
              type: "string",
              description: "Authorization code",
            },
            Status: {
              type: "string",
              description: "Payment status",
            },
            ErrDesc: {
              type: "string",
              description: "Error description",
            },
            Signature: {
              type: "string",
              description: "iPay88 signature for verification",
            },
            CCName: {
              type: "string",
              description: "Credit card holder name",
              nullable: true,
            },
            CCNo: {
              type: "string",
              description: "Masked credit card number",
              nullable: true,
            },
            S_bankname: {
              type: "string",
              description: "Bank name",
              nullable: true,
            },
            S_country: {
              type: "string",
              description: "Country code",
              nullable: true,
            },
          },
          required: [
            "MerchantCode",
            "PaymentId", 
            "RefNo",
            "Amount",
            "Currency",
            "TransId",
            "Status",
            "Signature"
          ],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payment verification completed",
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
                  payment_method: { type: "string" },
                  signature_valid: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad request - Invalid signature or parameters",
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
    404: notFoundMetadataResponse("Transaction not found"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { body } = data;

  try {
    const { 
      MerchantCode,
      PaymentId,
      RefNo,
      Amount,
      Currency,
      Remark,
      TransId,
      AuthCode,
      Status,
      ErrDesc,
      Signature,
      CCName,
      CCNo,
      S_bankname,
      S_country
    } = body;

    // Validate required parameters
    if (!MerchantCode || !RefNo || !Amount || !Currency || !Status || !Signature) {
      throw new Error("Missing required iPay88 response parameters");
    }

    // Get iPay88 configuration
    const config = getIpay88Config();

    // Verify merchant code matches
    if (MerchantCode !== config.merchantCode) {
      throw new Error("Invalid merchant code");
    }

    // Find transaction by reference number
    const transaction = await models.transaction.findOne({
      where: {
        metadata: {
          ipay88_reference: RefNo,
        },
      },
    });

    if (!transaction) {
      throw new Error(`Transaction not found for reference: ${RefNo}`);
    }

    // Verify signature
    const isSignatureValid = verifyIpay88Signature(
      config.merchantKey,
      MerchantCode,
      PaymentId,
      RefNo,
      Amount,
      Currency,
      Status,
      Signature
    );

    if (!isSignatureValid) {
      console.error("iPay88 signature verification failed", {
        reference: RefNo,
        expected_signature: Signature,
        received_data: { MerchantCode, PaymentId, RefNo, Amount, Currency, Status }
      });
      
      // Update transaction with failed verification
      await transaction.update({
        status: "FAILED",
        metadata: {
          ...transaction.metadata,
          verification_failed: true,
          signature_valid: false,
          ipay88_response: body,
        },
      });

      throw new Error("Invalid signature - payment verification failed");
    }

    // Convert amount back to decimal
    const actualAmount = convertFromIpay88Amount(Amount);

    // Verify amount matches
    if (Math.abs(actualAmount - transaction.amount) > 0.01) {
      throw new Error(`Amount mismatch: expected ${transaction.amount}, received ${actualAmount}`);
    }

    // Map iPay88 status to our status
    const mappedStatus = IPAY88_STATUS_MAPPING[Status] || "FAILED";
    
    // Update transaction with iPay88 response
    const updateData: any = {
      status: mappedStatus,
      metadata: {
        ...transaction.metadata,
        ipay88_transaction_id: TransId,
        ipay88_auth_code: AuthCode,
        ipay88_status: Status,
        ipay88_error_desc: ErrDesc,
        ipay88_remark: Remark,
        signature_valid: true,
        ipay88_response: body,
      },
    };

    // Add payment method information if available
    if (CCName || CCNo) {
      updateData.metadata.payment_method_details = {
        type: "credit_card",
        card_holder: CCName,
        masked_number: CCNo,
      };
    } else if (S_bankname) {
      updateData.metadata.payment_method_details = {
        type: "online_banking",
        bank_name: S_bankname,
        country: S_country,
      };
    }

    // If payment is successful, update user wallet
    if (mappedStatus === "COMPLETED") {
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
    }

    await transaction.update(updateData);

    // Get response message
    const responseMessage = IPAY88_RESPONSE_CODES[AuthCode] || ErrDesc || "Unknown response";

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        reference: RefNo,
        status: mappedStatus,
        amount: actualAmount,
        currency: Currency,
        gateway: "ipay88",
        ipay88_transaction_id: TransId,
        auth_code: AuthCode,
        response_message: responseMessage,
        payment_method: updateData.metadata.payment_method_details?.type || "unknown",
        signature_valid: true,
        timestamp: new Date().toISOString(),
      },
    };

  } catch (error) {
    console.error("iPay88 payment verification error:", error);
    
    if (error instanceof Ipay88Error) {
      throw new Error(`iPay88 Error: ${error.message}`);
    }
    
    throw new Error(error.message || "Failed to verify iPay88 payment");
  }
}; 