"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const kyc_1 = require("@b/utils/kyc");
const wallet_1 = require("@b/services/wallet");
const query_1 = require("@b/utils/query");
const uuid_1 = require("uuid");
const utils_1 = require("./utils");
const user_1 = require("./user");
exports.metadata = {
    summary: "Initiates a TransFi fiat deposit",
    description: "Registers the payer with TransFi if needed, creates a TransFi payin order and returns the hosted checkout URL.",
    operationId: "createTransfiDeposit",
    tags: ["Finance", "Deposit", "TransFi"],
    requiresAuth: true,
    logModule: "FIAT_DEPOSIT",
    logTitle: "Create TransFi deposit",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: { type: "number", description: "Amount to deposit, in major units" },
                        currency: { type: "string", description: "ISO currency code" },
                        paymentCode: { type: "string", description: "TransFi paymentCode" },
                        paymentType: { type: "string", description: "TransFi paymentType" },
                        payerDetails: {
                            type: "object",
                            description: "Payer identity fields required by TransFi on first deposit",
                            properties: {
                                dateOfBirth: { type: "string" },
                                country: { type: "string" },
                                street: { type: "string" },
                                city: { type: "string" },
                                state: { type: "string" },
                                postalCode: { type: "string" },
                            },
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Deposit initiated",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: { type: "object" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("TransFi gateway"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.DEPOSIT_WALLET, "deposit funds");
    (0, utils_1.assertTransfiConfig)();
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "").toUpperCase();
    const amount = Number(body === null || body === void 0 ? void 0 : body.amount);
    const payerDetails = (body === null || body === void 0 ? void 0 : body.payerDetails) || {};
    if (!currency)
        throw (0, error_1.createError)({ statusCode: 400, message: "Currency is required" });
    if (!Number.isFinite(amount) || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid deposit amount" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading TransFi gateway");
    const gateway = await db_1.models.depositGateway.findOne({
        where: { alias: "transfi", status: true },
    });
    if (!gateway) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("TransFi gateway is not enabled");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "TransFi is not available. Ask an administrator to enable it.",
        });
    }
    const enabled = (0, utils_1.parseGatewayCurrencies)(gateway.currencies);
    if (enabled.length && !enabled.includes(currency)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `${currency} is not enabled for TransFi deposits`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency wallet");
    const currencyRow = await db_1.models.currency.findOne({ where: { id: currency } });
    if (!currencyRow) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Currency ${currency} is not configured on this platform`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving payment method");
    const methods = await (0, utils_1.listPaymentMethods)(currency, "deposit");
    if (!methods.length) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `TransFi has no deposit methods configured for ${currency}`,
        });
    }
    let method = methods[0];
    if (body === null || body === void 0 ? void 0 : body.paymentCode) {
        const found = methods.find((m) => m.paymentCode === body.paymentCode);
        if (!found) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Unsupported payment method for ${currency}. Available: ${methods
                    .map((m) => m.paymentCode)
                    .join(", ")}`,
            });
        }
        method = found;
    }
    else if (methods.length > 1) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Choose a payment method for ${currency}: ${methods
                .map((m) => m.paymentCode)
                .join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Quoting and checking limits");
    let quote = null;
    let quotedLimits = null;
    try {
        quote = await (0, utils_1.getQuote)({
            sourceCurrency: currency,
            destinationCurrency: currency,
            amount,
            orderType: "payin",
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
        });
    }
    catch (error) {
        quotedLimits = (0, utils_1.extractLimitsFromError)(error);
        if (!quotedLimits) {
            console_1.logger.warn("TRANSFI", `quote failed for ${amount} ${currency}: ${error === null || error === void 0 ? void 0 : error.message}`);
        }
    }
    const limits = (0, utils_1.intersectLimits)(quote || quotedLimits, method);
    if (limits.min && amount < limits.min) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Minimum TransFi deposit for ${currency} via ${method.name} is ${limits.min} ${currency}`,
        });
    }
    if (limits.max && amount > limits.max) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum TransFi deposit for ${currency} via ${method.name} is ${limits.max} ${currency}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving TransFi payer identity");
    const mirror = await (0, user_1.resolveOrCreateTransfiUser)(user.id, payerDetails);
    if (mirror.kind === "needs_details") {
        return {
            success: false,
            status: "PAYER_DETAILS_REQUIRED",
            message: "TransFi requires a few more details before your first deposit.",
            data: { missing: mirror.missing },
        };
    }
    if (mirror.kind === "screening") {
        return {
            success: false,
            status: "PAYER_SCREENING",
            message: "Your payment profile is being verified by our payment partner. This usually takes under a minute.",
            data: {
                transfiUserId: mirror.transfiUserId,
                providerStatus: mirror.status,
                retryAfterSeconds: mirror.retryAfterSeconds,
            },
        };
    }
    if (mirror.kind === "rejected") {
        return {
            success: false,
            status: "PAYER_REJECTED",
            message: mirror.message ||
                "Our payment partner could not verify your details. Please contact support.",
            data: { providerStatus: mirror.status },
        };
    }
    const transfiUserId = mirror.transfiUserId;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating platform fee");
    const fixedFee = gateway.getFixedFee(currency) || 0;
    const percentageFee = gateway.getPercentageFee(currency) || 0;
    const platformFee = parseFloat(Math.max((amount * percentageFee) / 100 + fixedFee, 0).toFixed(2));
    const intentReference = `TFI-${(0, uuid_1.v4)()}`;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving wallet");
    const { wallet } = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating deposit intent");
    const transaction = await db_1.models.transaction.create({
        userId: user.id,
        walletId: wallet.id,
        type: "DEPOSIT",
        status: "PENDING",
        amount,
        fee: platformFee,
        referenceId: intentReference,
        description: `TransFi deposit of ${amount} ${currency}`,
        metadata: JSON.stringify({
            gateway: "transfi",
            currency,
            transfiUserId,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
            quotedFee: quote === null || quote === void 0 ? void 0 : quote.totalFee,
            quotedNet: quote === null || quote === void 0 ? void 0 : quote.destinationAmount,
        }),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating TransFi order");
    let order;
    try {
        order = await (0, utils_1.createPayinOrder)({
            transfiUserId,
            partnerId: transaction.id,
            sourceCurrency: currency,
            amount,
            destinationCurrency: currency,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
            successRedirectUrl: (0, utils_1.transfiReturnUrl)(transaction.id, "success"),
            failureRedirectUrl: (0, utils_1.transfiReturnUrl)(transaction.id, "failure"),
            customerMetaData: { platformUserId: user.id, platformTransactionId: transaction.id },
        });
    }
    catch (error) {
        if ((0, utils_1.isKycRequiredError)(error)) {
            await transaction.update({ status: "CANCELLED" });
            try {
                const kyc = await (0, utils_1.initiateStandardKyc)(transfiUserId, (0, utils_1.transfiKycReturnUrl)());
                return {
                    success: false,
                    status: "KYC_REQUIRED",
                    message: "Additional identity verification is required before this deposit.",
                    data: { kycUrl: kyc.kycUrl },
                };
            }
            catch (kycError) {
                console_1.logger.error("TRANSFI", `failed to start KYC for ${transfiUserId}: ${kycError === null || kycError === void 0 ? void 0 : kycError.message}`);
                return {
                    success: false,
                    status: "KYC_REQUIRED",
                    message: "Additional identity verification is required. Please contact support to continue.",
                };
            }
        }
        await transaction.update({
            status: "FAILED",
            metadata: JSON.stringify({
                gateway: "transfi",
                currency,
                transfiUserId,
                error: error instanceof utils_1.TransfiError ? `${error.code}: ${error.message}` : String((error === null || error === void 0 ? void 0 : error.message) || error),
                traceId: error instanceof utils_1.TransfiError ? error.traceId : undefined,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`TransFi order creation failed: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({
            statusCode: error instanceof utils_1.TransfiError && error.statusCode < 500 ? 400 : 502,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Could not start the TransFi payment",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Persisting TransFi order reference");
    await transaction.update({
        metadata: JSON.stringify({
            gateway: "transfi",
            currency,
            transfiUserId,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
            transfiOrderId: order.orderId,
            payUrl: order.payUrl,
            quotedFee: quote === null || quote === void 0 ? void 0 : quote.totalFee,
            quotedNet: quote === null || quote === void 0 ? void 0 : quote.destinationAmount,
            feeData: order.feeData,
        }),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi deposit initiated: ${amount} ${currency} (order ${order.orderId})`);
    return {
        success: true,
        data: {
            checkout_url: order.payUrl,
            order_id: order.orderId,
            transaction_id: transaction.id,
            currency,
            amount,
            fee: platformFee,
            paymentMethod: method.name,
            paymentsData: order.paymentsData,
        },
    };
};
