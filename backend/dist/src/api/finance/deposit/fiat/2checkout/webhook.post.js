"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
const utils_2 = require("@b/api/finance/utils");
const wallet_1 = require("@b/services/wallet");
exports.metadata = {
    summary: "2Checkout IPN webhook handler",
    description: "Handles Instant Payment Notifications (IPN) from 2Checkout to automatically process payment status updates",
    operationId: "handle2CheckoutWebhook",
    tags: ["Finance", "Webhook"],
    logModule: "WEBHOOK",
    logTitle: "2Checkout webhook",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    description: "2Checkout IPN payload",
                },
            },
            "application/x-www-form-urlencoded": {
                schema: {
                    type: "object",
                    description: "2Checkout IPN form data",
                },
            },
        },
    },
    responses: {
        200: {
            description: "IPN processed successfully",
            content: {
                "text/plain": {
                    schema: {
                        type: "string",
                        example: "OK",
                    },
                },
            },
        },
        400: {
            description: "Invalid IPN data",
        },
        500: {
            description: "Server error processing IPN",
        },
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    var _a;
    const { body, ctx } = data;
    try {
        const config = (0, utils_1.use2Checkout)();
        const ipnData = body;
        const { REFNO, ORDERNO, EXTERNAL_REFERENCE, ORDER_STATUS, PAYMENT_STATUS, SIGNATURE, TIMESTAMP, CURRENCY, TOTAL, } = ipnData || {};
        if (!REFNO && !ORDERNO) {
            console_1.logger.error("2CHECKOUT", "Missing required reference number");
            return { statusCode: 400, body: "Missing reference number" };
        }
        if (!SIGNATURE) {
            console_1.logger.error("2CHECKOUT", "Missing IPN signature");
            return { statusCode: 401, body: "Missing signature" };
        }
        const isValidSignature = (0, utils_1.verify2CheckoutSignature)({
            REFNO: REFNO || "",
            ORDERNO: ORDERNO || "",
            EXTERNAL_REFERENCE: EXTERNAL_REFERENCE || "",
            ORDER_STATUS: ORDER_STATUS || "",
            PAYMENT_STATUS: PAYMENT_STATUS || "",
            TIMESTAMP: TIMESTAMP || "",
            CURRENCY: CURRENCY || "",
            TOTAL: TOTAL || "",
        }, SIGNATURE, config.secretKey);
        if (!isValidSignature) {
            console_1.logger.error("2CHECKOUT", "Invalid signature");
            return { statusCode: 401, body: "Invalid signature" };
        }
        const whereOr = [];
        if (EXTERNAL_REFERENCE) {
            whereOr.push({ referenceId: EXTERNAL_REFERENCE });
            whereOr.push({ metadata: { [sequelize_1.Op.like]: `%"orderReference":"${EXTERNAL_REFERENCE}"%` } });
        }
        if (REFNO) {
            whereOr.push({ referenceId: REFNO });
            whereOr.push({ metadata: { [sequelize_1.Op.like]: `%"refNo":"${REFNO}"%` } });
        }
        if (whereOr.length === 0) {
            console_1.logger.warn("2CHECKOUT", "No usable reference in IPN payload");
            return { statusCode: 200, body: "OK" };
        }
        const transaction = await db_1.models.transaction.findOne({
            where: {
                type: "DEPOSIT",
                [sequelize_1.Op.or]: whereOr,
            },
            include: [{ model: db_1.models.wallet, as: "wallet" }],
        });
        if (!transaction) {
            console_1.logger.warn("2CHECKOUT", `Transaction not found for reference ${EXTERNAL_REFERENCE || REFNO || ORDERNO}`);
            return { statusCode: 200, body: "OK" };
        }
        const isSuccessful = ORDER_STATUS === "COMPLETE" ||
            ORDER_STATUS === "AUTHRECEIVED" ||
            PAYMENT_STATUS === "COMPLETE" ||
            PAYMENT_STATUS === "AUTHRECEIVED";
        const existingMetadata = JSON.parse(transaction.metadata || "{}");
        if (isSuccessful) {
            const wallet = transaction.wallet;
            if (!wallet) {
                console_1.logger.error("2CHECKOUT", `Transaction ${transaction.id} has no wallet attached`);
                return { statusCode: 200, body: "OK" };
            }
            if (CURRENCY && CURRENCY.toUpperCase() !== wallet.currency.toUpperCase()) {
                console_1.logger.error("2CHECKOUT", `Currency mismatch for ${REFNO}: wallet=${wallet.currency}, IPN=${CURRENCY}`);
                return { statusCode: 400, body: "Currency mismatch" };
            }
            if (TOTAL) {
                const ipnMinor = Math.round(parseFloat(String(TOTAL)) * 100);
                const expectedMinor = Math.round(transaction.amount * 100);
                if (!Number.isFinite(ipnMinor) || ipnMinor + 1 < expectedMinor) {
                    console_1.logger.error("2CHECKOUT", `Amount mismatch for ${REFNO}: expected>=${expectedMinor}, got ${ipnMinor}`);
                    return { statusCode: 400, body: "Amount mismatch" };
                }
            }
            let alreadyCredited = false;
            try {
                await (0, utils_2.processFiatDeposit)({
                    userId: transaction.userId,
                    currency: wallet.currency,
                    amount: transaction.amount,
                    fee: (_a = transaction.fee) !== null && _a !== void 0 ? _a : 0,
                    referenceId: REFNO || EXTERNAL_REFERENCE || ORDERNO,
                    method: "2CHECKOUT",
                    description: `2Checkout deposit - ${transaction.amount} ${wallet.currency}`,
                    metadata: {
                        refNo: REFNO,
                        orderNo: ORDERNO,
                        externalReference: EXTERNAL_REFERENCE,
                        source: "webhook",
                    },
                    idempotencyKey: `2checkout_deposit_${REFNO || EXTERNAL_REFERENCE}`,
                    ctx,
                });
            }
            catch (err) {
                if (err instanceof wallet_1.DuplicateOperationError) {
                    alreadyCredited = true;
                    console_1.logger.info("2CHECKOUT", `Deposit ${REFNO} already credited (idempotency hit)`);
                }
                else {
                    throw err;
                }
            }
            await transaction.update({
                status: "COMPLETED",
                metadata: JSON.stringify({
                    ...existingMetadata,
                    refNo: REFNO,
                    orderNo: ORDERNO,
                    externalReference: EXTERNAL_REFERENCE,
                    orderStatus: ORDER_STATUS,
                    paymentStatus: PAYMENT_STATUS,
                    gateway: "2checkout",
                    ipnTimestamp: TIMESTAMP,
                    processedAt: new Date().toISOString(),
                    source: alreadyCredited ? existingMetadata.source : "webhook",
                }),
            });
            console_1.logger.success("2CHECKOUT", `Transaction ${transaction.id} completed successfully`);
        }
        else {
            await transaction.update({
                status: "FAILED",
                metadata: JSON.stringify({
                    ...existingMetadata,
                    refNo: REFNO,
                    orderNo: ORDERNO,
                    externalReference: EXTERNAL_REFERENCE,
                    orderStatus: ORDER_STATUS,
                    paymentStatus: PAYMENT_STATUS,
                    gateway: "2checkout",
                    ipnTimestamp: TIMESTAMP,
                    failureReason: `Order status: ${ORDER_STATUS}, Payment status: ${PAYMENT_STATUS}`,
                    processedAt: new Date().toISOString(),
                }),
            });
            console_1.logger.warn("2CHECKOUT", `Transaction ${transaction.id} marked as failed`);
        }
        return { statusCode: 200, body: "OK" };
    }
    catch (error) {
        console_1.logger.error("2CHECKOUT", "IPN Error", error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
