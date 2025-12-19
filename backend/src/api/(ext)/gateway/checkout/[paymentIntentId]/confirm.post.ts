import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  sendWebhook,
  getGatewaySettings,
  collectGatewayFee,
  updateMerchantBalanceForPayment,
} from "@b/utils/gateway";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "@b/api/finance/currency/utils";
import { logger } from "@b/utils/console";

interface PaymentAllocation {
  walletId: string;
  walletType: string;
  currency: string;
  amount: number;
  equivalentInPaymentCurrency: number;
}

export const metadata: OperationObject = {
  summary: "Confirm payment",
  description:
    "Confirms the payment and processes the transaction from customer wallet(s). Always uses allocation-based payments.",
  operationId: "confirmPayment",
  tags: ["Gateway", "Checkout"],
  parameters: [
    {
      name: "paymentIntentId",
      in: "path",
      required: true,
      description: "Payment intent ID",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "array",
          description: "Payment allocations - which wallets to use and how much from each",
          items: {
            type: "object",
            properties: {
              walletId: { type: "string" },
              walletType: { type: "string" },
              currency: { type: "string" },
              amount: { type: "number" },
              equivalentInPaymentCurrency: { type: "number" },
            },
            required: ["walletId", "walletType", "currency", "amount", "equivalentInPaymentCurrency"],
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Payment confirmed successfully",
    },
    400: {
      description: "Payment cannot be confirmed",
    },
    401: {
      description: "Authentication required",
    },
    402: {
      description: "Insufficient funds",
    },
  },
  requiresAuth: true,
  logModule: "GATEWAY",
  logTitle: "Confirm Checkout Payment",
};

async function getPriceInUSD(currency: string, type: string): Promise<number> {
  try {
    if (type === "FIAT") {
      return await getFiatPriceInUSD(currency);
    } else if (type === "SPOT") {
      return await getSpotPriceInUSD(currency);
    } else if (type === "ECO") {
      return await getEcoPriceInUSD(currency);
    }
    return 0;
  } catch {
    return 0;
  }
}

// Round to 8 decimal places (max for crypto)
function roundAmount(amount: number): number {
  return Math.round(amount * 1e8) / 1e8;
}

export default async (data: Handler) => {
  const { params, user, body, headers, ctx } = data;
  const { paymentIntentId } = params;

  ctx?.step("Validate user authentication");

  if (!user?.id) {
    ctx?.fail("Authentication required - no user ID");
    throw createError({
      statusCode: 401,
      message: "Authentication required",
    });
  }

  ctx?.step("Find payment session");

  // Find payment with merchant info
  const payment = await models.gatewayPayment.findOne({
    where: {
      paymentIntentId,
    },
    include: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
      },
    ],
  });

  if (!payment) {
    ctx?.fail("Payment not found");
    throw createError({
      statusCode: 404,
      message: "Payment not found",
    });
  }

  ctx?.step("Verify payment authorization and status");

  // SECURITY: Verify user is authorized to complete this payment
  if (payment.customerId && payment.customerId !== user.id) {
    ctx?.fail("Not authorized to confirm this payment");
    throw createError({
      statusCode: 403,
      message: "Not authorized to confirm this payment",
    });
  }

  // Check if payment is still pending
  if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
    ctx?.fail(`Payment is already ${payment.status.toLowerCase()}`);
    throw createError({
      statusCode: 400,
      message: `Payment is already ${payment.status.toLowerCase()}`,
    });
  }

  // Check if expired
  if (new Date(payment.expiresAt) < new Date()) {
    await payment.update({ status: "EXPIRED" });
    throw createError({
      statusCode: 400,
      message: "Payment session has expired",
    });
  }

  // Check merchant status
  if (payment.merchant?.status !== "ACTIVE") {
    ctx?.fail("Merchant is not active");
    throw createError({
      statusCode: 400,
      message: "Merchant is not active",
    });
  }

  ctx?.step("Validate payment allocations");

  // Get gateway settings
  const gatewaySettings = await getGatewaySettings();
  const allowedWalletTypes = gatewaySettings.gatewayAllowedWalletTypes || {};

  // Body is the allocations array directly
  const allocations: PaymentAllocation[] = Array.isArray(body) ? body : [];

  if (allocations.length === 0) {
    ctx?.fail("No payment allocations provided");
    throw createError({
      statusCode: 400,
      message: "No payment allocations provided",
    });
  }

  // Validate allocations input
  for (const allocation of allocations) {
    // Validate amount is a positive finite number
    if (!Number.isFinite(allocation.amount) || allocation.amount <= 0) {
      throw createError({
        statusCode: 400,
        message: "Invalid allocation amount: must be a positive number",
      });
    }
    // Validate equivalent amount
    if (!Number.isFinite(allocation.equivalentInPaymentCurrency) || allocation.equivalentInPaymentCurrency <= 0) {
      throw createError({
        statusCode: 400,
        message: "Invalid equivalent amount",
      });
    }
  }

  // Check if this is a test mode payment
  const isTestMode = payment.testMode === true;

  ctx?.step("Process payment in database transaction");

  try {
    // Process payment in transaction
    const result = await sequelize.transaction(async (t) => {
      // SECURITY: Lock and update status inside transaction to prevent race conditions
      const lockedPayment = await models.gatewayPayment.findByPk(payment.id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!lockedPayment || (lockedPayment.status !== "PENDING" && lockedPayment.status !== "PROCESSING")) {
        throw createError({
          statusCode: 400,
          message: "Payment is no longer available for processing",
        });
      }

      // Mark as processing inside transaction
      await lockedPayment.update({ status: "PROCESSING" }, { transaction: t });

      const transactionRecords: any[] = [];
      let totalPaid = 0;

      // Get payment currency price for validation
      const paymentPriceInUSD = await getPriceInUSD(payment.currency, payment.walletType);
      if (!paymentPriceInUSD || paymentPriceInUSD <= 0) {
        throw createError({
          statusCode: 400,
          message: `Could not determine price for payment currency ${payment.currency}`,
        });
      }

      // Process each allocation
      for (const allocation of allocations) {
        // Round amount to 8 decimal places
        const roundedAmount = roundAmount(allocation.amount);

        // Validate wallet type is allowed
        const walletConfig = allowedWalletTypes[allocation.walletType];
        if (!walletConfig || !walletConfig.enabled) {
          throw createError({
            statusCode: 400,
            message: `Wallet type ${allocation.walletType} is not enabled for payments`,
          });
        }

        // Validate currency is allowed for this wallet type
        if (!walletConfig.currencies || !walletConfig.currencies.includes(allocation.currency)) {
          throw createError({
            statusCode: 400,
            message: `Currency ${allocation.currency} is not enabled for ${allocation.walletType} wallet payments`,
          });
        }

        // Find and lock the wallet
        const wallet = await models.wallet.findOne({
          where: {
            id: allocation.walletId,
            userId: user.id,
            currency: allocation.currency,
            type: allocation.walletType,
          },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!wallet) {
          throw createError({
            statusCode: 400,
            message: `Wallet not found: ${allocation.walletType} ${allocation.currency}`,
          });
        }

        // Check balance
        const currentBalance = parseFloat(wallet.balance);
        if (currentBalance < roundedAmount) {
          throw createError({
            statusCode: 402,
            message: `Insufficient funds in ${allocation.currency} wallet. Required: ${roundedAmount}, Available: ${currentBalance}`,
          });
        }

        // Verify exchange rate (with 2% tolerance for rate fluctuations)
        const walletPriceInUSD = await getPriceInUSD(allocation.currency, allocation.walletType);
        if (!walletPriceInUSD || walletPriceInUSD <= 0) {
          throw createError({
            statusCode: 400,
            message: `Could not determine price for ${allocation.currency}`,
          });
        }

        const expectedExchangeRate = walletPriceInUSD / paymentPriceInUSD;
        const expectedEquivalent = roundedAmount * expectedExchangeRate;
        const tolerance = 0.02; // 2% tolerance

        if (Math.abs(allocation.equivalentInPaymentCurrency - expectedEquivalent) / expectedEquivalent > tolerance) {
          throw createError({
            statusCode: 400,
            message: `Exchange rate has changed for ${allocation.currency}. Please refresh and try again.`,
          });
        }

        // Only debit wallet and create transaction in LIVE mode
        if (!isTestMode) {
          // Debit wallet
          await wallet.update(
            {
              balance: roundAmount(currentBalance - roundedAmount),
            },
            { transaction: t }
          );

          // Create transaction record
          const transactionRecord = await models.transaction.create(
            {
              userId: user.id,
              walletId: wallet.id,
              type: "PAYMENT",
              status: "COMPLETED",
              amount: roundedAmount,
              fee: 0,
              description: `Payment to ${payment.merchant.name}${payment.description ? ` - ${payment.description}` : ""} (${allocation.equivalentInPaymentCurrency.toFixed(2)} ${payment.currency})`,
              referenceId: `${payment.id}_${transactionRecords.length}`,
              metadata: JSON.stringify({
                paymentIntentId: payment.paymentIntentId,
                merchantId: payment.merchant.id,
                merchantName: payment.merchant.name,
                merchantOrderId: payment.merchantOrderId,
                equivalentAmount: allocation.equivalentInPaymentCurrency,
                paymentCurrency: payment.currency,
                exchangeRate: expectedExchangeRate,
              }),
            },
            { transaction: t }
          );

          transactionRecords.push(transactionRecord);
        }

        totalPaid += allocation.equivalentInPaymentCurrency;
      }

      // Verify total paid covers payment amount (with small tolerance for rounding)
      const tolerance = 0.01; // $0.01 tolerance
      if (totalPaid < payment.amount - tolerance) {
        throw createError({
          statusCode: 402,
          message: `Insufficient payment. Required: ${payment.amount} ${payment.currency}, Allocated: ${totalPaid.toFixed(2)} ${payment.currency}`,
        });
      }

      // Credit merchant balance and collect fees
      // Note: We credit gatewayMerchantBalance.pending (NOT wallet.inOrder)
      // because wallet.inOrder is shared with trading/orders
      if (!isTestMode) {
        // Calculate fee percentage from original payment amount
        const feePercentage = payment.feeAmount / payment.amount;

        // Process each allocation - credit merchant balance and collect fee in same currency
        for (let i = 0; i < allocations.length; i++) {
          const allocation = allocations[i];
          const roundedAmount = roundAmount(allocation.amount);

          // Calculate proportional fee for this allocation (in allocation currency)
          const allocationFee = roundAmount(roundedAmount * feePercentage);

          // Collect fee to super admin in same currency as allocation
          if (allocationFee > 0) {
            await collectGatewayFee({
              currency: allocation.currency,
              walletType: allocation.walletType as "FIAT" | "SPOT" | "ECO",
              feeAmount: allocationFee,
              merchantId: payment.merchant.id,
              paymentId: payment.id,
              transaction: t,
            });
          }

          // Credit merchant's gateway balance (pending) for this currency
          // This is the source of truth for gateway funds - NOT wallet.inOrder
          await updateMerchantBalanceForPayment({
            merchantId: payment.merchantId,
            currency: allocation.currency,
            walletType: allocation.walletType as "FIAT" | "SPOT" | "ECO",
            amount: roundedAmount,
            feeAmount: allocationFee,
            transaction: t,
          });
        }
      }

      // Update payment status
      const completedAt = new Date();
      await payment.update(
        {
          status: "COMPLETED",
          customerId: user.id,
          transactionId: transactionRecords[0]?.id || null,
          completedAt,
          ipAddress: headers?.["x-forwarded-for"] || headers?.["x-real-ip"],
          userAgent: headers?.["user-agent"],
          customerEmail: user.email,
          customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || null,
          allocations,
          metadata: {
            ...payment.metadata,
            isTestMode,
            transactionIds: isTestMode ? "[]" : JSON.stringify(transactionRecords.map((t) => t.id)),
          },
        },
        { transaction: t }
      );

      return { transactionRecords, completedAt };
    });

    ctx?.step("Send payment completion webhook");

    // Send webhook
    if (payment.webhookUrl) {
      try {
        await sendWebhook(
          payment.merchant.id,
          payment.id,
          null,
          "payment.completed",
          payment.webhookUrl,
          {
            id: `evt_${payment.paymentIntentId}`,
            type: "payment.completed",
            createdAt: new Date().toISOString(),
            data: {
              id: payment.paymentIntentId,
              merchantOrderId: payment.merchantOrderId,
              amount: payment.amount,
              currency: payment.currency,
              feeAmount: payment.feeAmount,
              netAmount: payment.netAmount,
              status: "COMPLETED",
              customerEmail: user.email,
              metadata: payment.metadata,
              completedAt: result.completedAt.toISOString(),
              allocations,
            },
          },
          payment.merchant.webhookSecret
        );
      } catch (error) {
        logger.error("GATEWAY_CHECKOUT", "Failed to send payment.completed webhook", error);
      }
    }

    ctx?.step("Build success redirect URL");

    // Build redirect URL with parameters
    const returnUrl = new URL(payment.returnUrl);
    returnUrl.searchParams.set("payment_id", payment.paymentIntentId);
    returnUrl.searchParams.set("status", "success");

    ctx?.success("Payment confirmed successfully");

    return {
      success: true,
      paymentId: payment.paymentIntentId,
      status: "COMPLETED",
      redirectUrl: returnUrl.toString(),
    };
  } catch (error: any) {
    // Log full error for debugging
    logger.error("GATEWAY_CHECKOUT", "Payment confirmation failed", error);
    if (error.errors) {
      logger.debug("GATEWAY_CHECKOUT", `Validation errors: ${JSON.stringify(error.errors, null, 2)}`);
    }

    // If error, revert to pending status
    if (payment.status === "PROCESSING") {
      await payment.update({ status: "PENDING" });
    }

    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
      const messages = error.errors?.map((e: any) => e.message).join(", ") || error.message;
      throw createError({
        statusCode: 400,
        message: messages,
      });
    }

    // Send failure webhook
    if (payment.webhookUrl && error.statusCode !== 402) {
      try {
        await sendWebhook(
          payment.merchant.id,
          payment.id,
          null,
          "payment.failed",
          payment.webhookUrl,
          {
            id: `evt_${payment.paymentIntentId}`,
            type: "payment.failed",
            createdAt: new Date().toISOString(),
            data: {
              id: payment.paymentIntentId,
              merchantOrderId: payment.merchantOrderId,
              amount: payment.amount,
              currency: payment.currency,
              status: "FAILED",
              error: error.message,
            },
          },
          payment.merchant.webhookSecret
        );
      } catch (webhookError) {
        logger.error("GATEWAY_CHECKOUT", "Failed to send payment.failed webhook", webhookError);
      }
    }

    throw error;
  }
};
