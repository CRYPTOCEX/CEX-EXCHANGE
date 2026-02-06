"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("./utils");
const console_1 = require("@b/utils/console");
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
    const { body, ctx } = data;
    try {
        const config = (0, utils_1.use2Checkout)();
        const ipnData = body;
        const { REFNO, ORDERNO, EXTERNAL_REFERENCE, ORDER_STATUS, PAYMENT_STATUS, SIGNATURE, TIMESTAMP, CURRENCY, TOTAL, } = ipnData;
        if (!REFNO && !ORDERNO) {
            console_1.logger.error("2CHECKOUT", "Missing required reference number");
            return { statusCode: 400, body: "Missing reference number" };
        }
        if (SIGNATURE) {
            const verificationParams = {
                REFNO: REFNO || "",
                ORDERNO: ORDERNO || "",
                EXTERNAL_REFERENCE: EXTERNAL_REFERENCE || "",
                ORDER_STATUS: ORDER_STATUS || "",
                PAYMENT_STATUS: PAYMENT_STATUS || "",
                TIMESTAMP: TIMESTAMP || "",
                CURRENCY: CURRENCY || "",
                TOTAL: TOTAL || "",
            };
            const isValidSignature = (0, utils_1.verify2CheckoutSignature)(verificationParams, SIGNATURE, config.secretKey);
            if (!isValidSignature) {
                console_1.logger.error("2CHECKOUT", "Invalid signature");
                return { statusCode: 400, body: "Invalid signature" };
            }
        }
        const whereCondition = EXTERNAL_REFERENCE
            ? {
                description: {
                    [sequelize_1.Op.like]: `%${EXTERNAL_REFERENCE}%`,
                },
            }
            : {
                metadata: {
                    [sequelize_1.Op.like]: `%${REFNO || ORDERNO}%`,
                },
            };
        const transaction = await db_1.models.transaction.findOne({
            where: {
                ...whereCondition,
                type: "DEPOSIT",
                status: "PENDING",
            },
            include: [
                {
                    model: db_1.models.wallet,
                    as: "wallet",
                },
            ],
        });
        if (!transaction) {
            console_1.logger.warn("2CHECKOUT", `Transaction not found for reference ${EXTERNAL_REFERENCE || REFNO || ORDERNO}`);
            return { statusCode: 200, body: "OK" };
        }
        const isSuccessful = ORDER_STATUS === "COMPLETE" ||
            ORDER_STATUS === "AUTHRECEIVED" ||
            PAYMENT_STATUS === "COMPLETE" ||
            PAYMENT_STATUS === "AUTHRECEIVED";
        await db_1.sequelize.transaction(async (t) => {
            if (isSuccessful) {
                await transaction.update({
                    status: "COMPLETED",
                    metadata: JSON.stringify({
                        ...JSON.parse(transaction.metadata || "{}"),
                        refNo: REFNO,
                        orderNo: ORDERNO,
                        externalReference: EXTERNAL_REFERENCE,
                        orderStatus: ORDER_STATUS,
                        paymentStatus: PAYMENT_STATUS,
                        gateway: "2checkout",
                        ipnTimestamp: TIMESTAMP,
                        processedAt: new Date().toISOString(),
                        ipnData: ipnData,
                    }),
                }, { transaction: t });
                const wallet = transaction.wallet;
                if (wallet) {
                    const depositAmount = parseFloat(String(transaction.amount));
                    const feeAmount = parseFloat(String(transaction.fee || 0));
                    const netAmount = depositAmount - feeAmount;
                    const newBalance = parseFloat(String(wallet.balance)) + netAmount;
                    await wallet.update({ balance: newBalance }, { transaction: t });
                    console_1.logger.info("2CHECKOUT", `Wallet ${wallet.id} balance updated by ${netAmount} ${wallet.currency}`);
                }
                console_1.logger.success("2CHECKOUT", `Transaction ${transaction.id} completed successfully`);
            }
            else {
                await transaction.update({
                    status: "FAILED",
                    metadata: JSON.stringify({
                        ...JSON.parse(transaction.metadata || "{}"),
                        refNo: REFNO,
                        orderNo: ORDERNO,
                        externalReference: EXTERNAL_REFERENCE,
                        orderStatus: ORDER_STATUS,
                        paymentStatus: PAYMENT_STATUS,
                        gateway: "2checkout",
                        ipnTimestamp: TIMESTAMP,
                        failureReason: `Order status: ${ORDER_STATUS}, Payment status: ${PAYMENT_STATUS}`,
                        processedAt: new Date().toISOString(),
                        ipnData: ipnData,
                    }),
                }, { transaction: t });
                console_1.logger.warn("2CHECKOUT", `Transaction ${transaction.id} marked as failed`);
            }
        });
        return { statusCode: 200, body: "OK" };
    }
    catch (error) {
        console_1.logger.error("2CHECKOUT", "IPN Error", error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};
