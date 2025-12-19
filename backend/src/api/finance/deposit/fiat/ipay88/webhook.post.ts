import {
  notFoundMetadataResponse,
  serverErrorResponse,
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
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Handles iPay88 webhook notifications",
  description:
    "Processes iPay88 backend notifications for payment events. This endpoint handles automatic payment status updates, wallet balance updates, and transaction processing based on iPay88's notification system.",
  operationId: "handleIpay88Webhook",
  tags: ["Finance", "Webhook"],
  logModule: "WEBHOOK",
  logTitle: "iPay88 webhook",
  requestBody: {
    description: "iPay88 webhook notification data",
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
      description: "Webhook processed successfully",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "RECEIVEOK",
          },
        },
      },
    },
    400: {
      description: "Bad request - Invalid signature or parameters",
      content: {
        "text/plain": {
          schema: {
            type: "string",
            example: "FAIL",
          },
        },
      },
    },
    404: notFoundMetadataResponse("Transaction not found"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { body, ctx } = data;

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

    logger.info("IPAY88", `Webhook received - ref: ${RefNo}, status: ${Status}, amount: ${Amount} ${Currency}`)

    // Validate required parameters
    if (!MerchantCode || !RefNo || !Amount || !Currency || !Status || !Signature) {
      logger.error("IPAY88", "Missing required webhook parameters")
      return new Response("FAIL", { status: 400 });
    }

    // Get iPay88 configuration
    const config = getIpay88Config();

    // Verify merchant code matches
    if (MerchantCode !== config.merchantCode) {
      logger.error("IPAY88", `Invalid merchant code in webhook: ${MerchantCode}`)
      return new Response("FAIL", { status: 400 });
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
      logger.error("IPAY88", `Transaction not found for reference: ${RefNo}`)
      return new Response("FAIL", { status: 404 });
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
      logger.error("IPAY88", `Webhook signature verification failed for reference: ${RefNo}`)

      // Update transaction with failed verification
      await transaction.update({
        status: "FAILED",
        metadata: {
          ...transaction.metadata,
          webhook_verification_failed: true,
          signature_valid: false,
          ipay88_webhook_response: body,
        },
      });

      return new Response("FAIL", { status: 400 });
    }

    // Convert amount back to decimal
    const actualAmount = convertFromIpay88Amount(Amount);

    // Verify amount matches (allow small rounding differences)
    if (Math.abs(actualAmount - transaction.amount) > 0.01) {
      logger.error("IPAY88", `Amount mismatch: expected ${transaction.amount}, received ${actualAmount}`)
      return new Response("FAIL", { status: 400 });
    }

    // Map iPay88 status to our status
    const mappedStatus = IPAY88_STATUS_MAPPING[Status] || "FAILED";
    
    // Check if transaction is already processed
    if (transaction.status === "COMPLETED" && mappedStatus === "COMPLETED") {
      logger.debug("IPAY88", `Transaction ${RefNo} already completed, skipping`)
      return new Response("RECEIVEOK", { status: 200 });
    }

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
        ipay88_webhook_response: body,
        webhook_processed_at: new Date().toISOString(),
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
      updateData.metadata.wallet_updated_at = new Date().toISOString();

      logger.success("IPAY88", `Wallet updated for user ${transaction.userId}: +${transaction.amount} ${transaction.metadata.currency}`)
    }

    await transaction.update(updateData);

    // Log successful processing
    logger.success("IPAY88", `Webhook processed for ${RefNo}: status=${mappedStatus}, amount=${actualAmount} ${Currency}`)

    // Return success response to iPay88
    return new Response("RECEIVEOK", { status: 200 });

  } catch (error) {
    logger.error("IPAY88", "Webhook processing error", error)
    return new Response("FAIL", { status: 500 });
  }
}; 