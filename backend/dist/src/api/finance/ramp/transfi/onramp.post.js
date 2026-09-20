"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const kyc_1 = require("@b/utils/kyc");
const query_1 = require("@b/utils/query");
const uuid_1 = require("uuid");
const utils_1 = require("@b/api/finance/deposit/fiat/transfi/utils");
const user_1 = require("@b/api/finance/deposit/fiat/transfi/user");
const utils_2 = require("./utils");
exports.metadata = {
    summary: "Buys crypto with fiat via TransFi (onramp)",
    description: "Creates a TransFi onramp order. In the default 'self' custody mode the crypto is delivered to an address the customer supplies and never touches the platform.",
    operationId: "createTransfiOnramp",
    tags: ["Finance", "Ramp", "TransFi"],
    requiresAuth: true,
    logModule: "FIAT_DEPOSIT",
    logTitle: "Create TransFi onramp",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: { type: "number", description: "Fiat amount to spend, major units" },
                        currency: { type: "string", description: "Fiat currency to spend" },
                        token: { type: "string", description: "Network-encoded crypto ticker, e.g. USDT or USDCSOL" },
                        walletAddress: { type: "string", description: "Destination address (self custody)" },
                        paymentCode: { type: "string" },
                        paymentType: { type: "string" },
                        payerDetails: {
                            type: "object",
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
                    required: ["amount", "currency", "token"],
                },
            },
        },
    },
    responses: {
        200: { description: "Onramp created", content: { "application/json": { schema: { type: "object" } } } },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.DEPOSIT_WALLET, "buy crypto");
    (0, utils_1.assertTransfiConfig)();
    const settings = await (0, utils_2.getRampSettings)();
    if (!settings.onrampEnabled) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Buying crypto via TransFi is not enabled. Ask an administrator to turn it on.",
        });
    }
    (0, utils_2.assertCustodySupported)("onramp", settings.onrampCustody);
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "").toUpperCase();
    const token = String((body === null || body === void 0 ? void 0 : body.token) || "").toUpperCase();
    const amount = Number(body === null || body === void 0 ? void 0 : body.amount);
    const walletAddress = String((body === null || body === void 0 ? void 0 : body.walletAddress) || "").trim();
    if (!currency || !token) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Currency and token are required" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid amount" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token");
    const tokens = await (0, utils_2.listTokens)("deposit");
    const match = tokens.find((t) => String(t.cryptoTicker || t.symbol || "").toUpperCase() === token);
    if (!match) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Unsupported token. Available: ${tokens
                .map((t) => t.cryptoTicker || t.symbol)
                .filter(Boolean)
                .join(", ")}`,
        });
    }
    if (!walletAddress) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "A destination wallet address is required",
        });
    }
    if (!(0, utils_2.looksLikeAddress)(token, walletAddress)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `That does not look like a valid ${match.network || token} address. Check it and try again.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving payment method");
    const methods = await (0, utils_1.listPaymentMethods)(currency, "deposit");
    if (!methods.length) {
        throw (0, error_1.createError)({ statusCode: 400, message: `No TransFi payment methods for ${currency}` });
    }
    let method = methods[0];
    if (body === null || body === void 0 ? void 0 : body.paymentCode) {
        const found = methods.find((m) => m.paymentCode === body.paymentCode);
        if (!found) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Unsupported payment method. Available: ${methods.map((m) => m.paymentCode).join(", ")}`,
            });
        }
        method = found;
    }
    else if (methods.length > 1) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Choose a payment method: ${methods.map((m) => m.paymentCode).join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking limits");
    const limits = await (0, utils_1.resolveCorridorLimits)(currency, method, amount);
    if (limits.min && amount < limits.min) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Minimum is ${limits.min} ${currency} via ${method.name}`,
        });
    }
    if (limits.max && amount > limits.max) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum is ${limits.max} ${currency} via ${method.name}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving TransFi identity");
    const mirror = await (0, user_1.resolveOrCreateTransfiUser)(user.id, ((body === null || body === void 0 ? void 0 : body.payerDetails) || {}));
    if (mirror.kind === "needs_details") {
        return {
            success: false,
            status: "PAYER_DETAILS_REQUIRED",
            message: "TransFi requires a few more details before your first purchase.",
            data: { missing: mirror.missing },
        };
    }
    if (mirror.kind === "screening") {
        return {
            success: false,
            status: "PAYER_SCREENING",
            message: "Your profile is being verified by our payment partner.",
            data: { retryAfterSeconds: mirror.retryAfterSeconds },
        };
    }
    if (mirror.kind === "rejected") {
        return {
            success: false,
            status: "PAYER_REJECTED",
            message: mirror.message || "Our payment partner could not verify your details.",
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording purchase");
    const reference = `TFR-${(0, uuid_1.v4)()}`;
    const { wallet: anchorWallet } = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "FIAT", currency);
    const record = await db_1.models.transaction.create({
        userId: user.id,
        walletId: anchorWallet.id,
        type: "PAYMENT",
        status: "PENDING",
        amount,
        fee: 0,
        referenceId: reference,
        description: `Buy ${token} with ${amount} ${currency} via TransFi`,
        metadata: JSON.stringify({
            gateway: "transfi",
            flow: "onramp",
            custody: settings.onrampCustody,
            currency,
            token,
            network: match.network,
            walletAddress,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
        }),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating TransFi onramp order");
    try {
        const order = await (0, utils_2.createOnrampOrder)({
            transfiUserId: mirror.transfiUserId,
            partnerId: record.id,
            sourceCurrency: currency,
            amount,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
            destinationTicker: token,
            walletAddress,
            custody: settings.onrampCustody,
            transactionId: record.id,
        });
        await record.update({
            metadata: JSON.stringify({
                gateway: "transfi",
                flow: "onramp",
                custody: settings.onrampCustody,
                currency,
                token,
                network: match.network,
                walletAddress,
                paymentCode: method.paymentCode,
                paymentType: method.paymentType,
                transfiOrderId: order.orderId,
                payUrl: order.payUrl,
                feeData: order.feeData,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi onramp created: ${order.orderId}`);
        return {
            success: true,
            data: {
                checkout_url: order.payUrl,
                order_id: order.orderId,
                transaction_id: record.id,
                token,
                network: match.network,
                walletAddress,
                estimatedCrypto: (_a = order.feeData) === null || _a === void 0 ? void 0 : _a.withdrawAmount,
                fee: (_b = order.feeData) === null || _b === void 0 ? void 0 : _b.totalFee,
            },
        };
    }
    catch (error) {
        if ((0, utils_1.isKycRequiredError)(error)) {
            await record.update({ status: "CANCELLED" });
            try {
                const kyc = await (0, utils_1.initiateStandardKyc)(mirror.transfiUserId, (0, utils_1.transfiKycReturnUrl)());
                return {
                    success: false,
                    status: "KYC_REQUIRED",
                    message: "Additional identity verification is required before this purchase.",
                    data: { kycUrl: kyc.kycUrl },
                };
            }
            catch (_c) {
                return {
                    success: false,
                    status: "KYC_REQUIRED",
                    message: "Additional identity verification is required. Please contact support.",
                };
            }
        }
        await record.update({
            status: "FAILED",
            metadata: JSON.stringify({
                gateway: "transfi",
                flow: "onramp",
                currency,
                token,
                error: error instanceof utils_1.TransfiError ? `${error.code}: ${error.message}` : String(error === null || error === void 0 ? void 0 : error.message),
                traceId: error instanceof utils_1.TransfiError ? error.traceId : undefined,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`TransFi onramp failed: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({
            statusCode: error instanceof utils_1.TransfiError && error.statusCode < 500 ? 400 : 502,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Could not start the purchase",
        });
    }
};
