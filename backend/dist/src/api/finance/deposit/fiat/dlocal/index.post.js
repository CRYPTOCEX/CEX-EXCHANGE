"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const console_1 = require("@b/utils/console");
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
exports.metadata = {
    summary: "Creates a dLocal payment",
    description: "Initiates a dLocal payment process for emerging markets. Supports multiple payment methods including cards, bank transfers, cash payments, and digital wallets across 60+ countries.",
    operationId: "createDLocalPayment",
    tags: ["Finance", "Deposit"],
    logModule: "DLOCAL_DEPOSIT",
    logTitle: "Create dLocal payment",
    requestBody: {
        description: "Payment information including customer details and document ID for compliance",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Payment amount in the specified currency",
                        },
                        currency: {
                            type: "string",
                            description: "Currency code (e.g., USD, BRL, ARS)",
                        },
                        country: {
                            type: "string",
                            description: "Two-letter country code (e.g., BR, AR, MX)",
                        },
                        payment_method_id: {
                            type: "string",
                            description: "Payment method ID (e.g., CARD, VI, MC, or specific local methods)",
                            default: "CARD",
                        },
                        customer: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                    description: "Customer full name",
                                },
                                email: {
                                    type: "string",
                                    description: "Customer email address",
                                },
                                document_id: {
                                    type: "string",
                                    description: "Customer document ID (required for most countries)",
                                },
                                phone: {
                                    type: "string",
                                    description: "Customer phone number with country code",
                                },
                                address: {
                                    type: "object",
                                    properties: {
                                        street: { type: "string" },
                                        city: { type: "string" },
                                        state: { type: "string" },
                                        zip_code: { type: "string" },
                                    },
                                },
                            },
                            required: ["name", "email"],
                        },
                        description: {
                            type: "string",
                            description: "Payment description",
                        },
                    },
                    required: ["amount", "currency", "country", "customer"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "dLocal payment created successfully. Returns payment details and redirect URL for completion.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "dLocal payment ID",
                            },
                            order_id: {
                                type: "string",
                                description: "Internal order reference",
                            },
                            status: {
                                type: "string",
                                description: "Payment status",
                            },
                            amount: {
                                type: "number",
                                description: "Payment amount",
                            },
                            currency: {
                                type: "string",
                                description: "Payment currency",
                            },
                            payment_method_type: {
                                type: "string",
                                description: "Type of payment method used",
                            },
                            redirect_url: {
                                type: "string",
                                description: "URL to redirect customer for payment completion",
                                nullable: true,
                            },
                            payment_url: {
                                type: "string",
                                description: "Direct payment URL",
                                nullable: true,
                            },
                            created_date: {
                                type: "string",
                                description: "Payment creation timestamp",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("dLocal"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { amount, currency, country, payment_method_id = "CARD", customer, description = "Deposit" } = body;
    if (!(0, utils_1.validateCurrency)(currency)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by dLocal` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
    const gateway = await db_1.models.depositGateway.findOne({
        where: { alias: "dlocal", status: true },
    });
    if (!gateway) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment gateway not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "dLocal gateway not found or disabled" });
    }
    if (!((_a = gateway.currencies) === null || _a === void 0 ? void 0 : _a.includes(currency))) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by dLocal gateway configuration` });
    }
    const countryInfo = utils_1.COUNTRY_DOCUMENT_REQUIREMENTS[country === null || country === void 0 ? void 0 : country.toUpperCase()];
    if ((countryInfo === null || countryInfo === void 0 ? void 0 : countryInfo.required) && !customer.document_id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Document ID is required for ${country}. Required: ${countryInfo.name} (${countryInfo.format})`
        });
    }
    const { fixedFee, percentageFee } = gateway;
    const percentageFeeNum = typeof percentageFee === 'number' ? percentageFee : 0;
    const fixedFeeNum = typeof fixedFee === 'number' ? fixedFee : 0;
    const feeAmount = (amount * percentageFeeNum) / 100 + fixedFeeNum;
    const totalAmount = amount + feeAmount;
    const orderId = `DL-${Date.now()}-${user.id}`;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting or creating wallet");
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
        const wallet = walletResult.wallet;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating transaction record");
        const transaction = await db_1.models.transaction.create({
            walletId: wallet.id,
            referenceId: orderId,
            userId: user.id,
            type: "DEPOSIT",
            status: "PENDING",
            amount: amount,
            fee: feeAmount,
            description: description,
            metadata: JSON.stringify({
                gateway: "dlocal",
                currency: currency,
                country: country,
                payment_method_id: payment_method_id,
                customer: customer,
            }),
        });
        const paymentRequest = {
            amount: totalAmount,
            currency: currency.toUpperCase(),
            country: country.toUpperCase(),
            payment_method_id: payment_method_id,
            order_id: orderId,
            payer: {
                name: customer.name,
                email: customer.email,
                document: customer.document_id,
                phone: customer.phone,
                address: customer.address ? {
                    country: country.toUpperCase(),
                    state: customer.address.state,
                    city: customer.address.city,
                    zip_code: customer.address.zip_code,
                    street: customer.address.street,
                } : undefined,
            },
            description: description,
            notification_url: `${publicUrl}${isProduction ? "" : ":3000"}/api/finance/deposit/fiat/dlocal/webhook`,
            callback_url: `${publicUrl}${isProduction ? "" : ":3000"}/finance/deposit?gateway=dlocal&status=success`,
        };
        const paymentResponse = await (0, utils_1.makeDLocalRequest)("/payments", "POST", paymentRequest);
        await transaction.update({
            referenceId: paymentResponse.id,
            metadata: JSON.stringify({
                ...transaction.metadata,
                dlocal_payment_id: paymentResponse.id,
                dlocal_status: paymentResponse.status,
                dlocal_status_code: paymentResponse.status_code,
                payment_method_type: paymentResponse.payment_method_type,
                payment_method_flow: paymentResponse.payment_method_flow,
            }),
        });
        console_1.logger.info("DLOCAL", `Payment created: ${paymentResponse.id} for user ${user.id}`);
        return {
            id: paymentResponse.id,
            order_id: orderId,
            status: paymentResponse.status,
            amount: paymentResponse.amount,
            currency: paymentResponse.currency,
            payment_method_type: paymentResponse.payment_method_type,
            redirect_url: paymentResponse.redirect_url,
            payment_url: paymentResponse.payment_url,
            created_date: paymentResponse.created_date,
        };
    }
    catch (error) {
        console_1.logger.error("DLOCAL", "Payment creation error", error);
        if (orderId) {
            try {
                await db_1.models.transaction.update({
                    status: "FAILED",
                    metadata: JSON.stringify({
                        error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
                        timestamp: new Date().toISOString(),
                    })
                }, { where: { referenceId: orderId } });
            }
            catch (updateError) {
                console_1.logger.error("DLOCAL", "Failed to update transaction status", updateError);
            }
        }
        if (error instanceof utils_1.DLocalError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `dLocal API Error: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Payment creation failed: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
    }
};
