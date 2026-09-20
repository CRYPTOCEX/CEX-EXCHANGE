"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const wallet_1 = require("@b/services/wallet");
const error_1 = require("@b/utils/error");
const kyc_1 = require("@b/utils/kyc");
const withdraw_2fa_1 = require("@b/utils/withdraw-2fa");
const query_1 = require("@b/utils/query");
const uuid_1 = require("uuid");
const utils_1 = require("@b/api/finance/deposit/fiat/transfi/utils");
const user_1 = require("@b/api/finance/deposit/fiat/transfi/user");
const utils_2 = require("@b/api/finance/withdraw/fiat/transfi/utils");
const utils_3 = require("./utils");
exports.metadata = {
    summary: "Sells crypto for fiat via TransFi (offramp)",
    description: "Creates a TransFi offramp order and returns the address the crypto must be sent to. In the default 'self' custody mode the customer sends from their own wallet and the platform never holds the crypto.",
    operationId: "createTransfiOfframp",
    tags: ["Finance", "Ramp", "TransFi"],
    requiresAuth: true,
    logModule: "FIAT_WITHDRAW",
    logTitle: "Create TransFi offramp",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: { type: "number", description: "Crypto amount to sell, major units" },
                        token: { type: "string", description: "Network-encoded crypto ticker being sold" },
                        currency: { type: "string", description: "Fiat currency to receive" },
                        paymentCode: { type: "string" },
                        paymentType: { type: "string" },
                        beneficiary: {
                            type: "object",
                            description: "Where the fiat lands",
                            properties: {
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                phoneCode: { type: "string" },
                            },
                        },
                        twoFactorToken: { type: "string" },
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
                    required: ["amount", "token", "currency"],
                },
            },
        },
    },
    responses: {
        200: { description: "Offramp created", content: { "application/json": { schema: { type: "object" } } } },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    var _b;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    await (0, kyc_1.assertKycFeature)(user.id, kyc_1.KYC_FEATURES.WITHDRAW_WALLET, "sell crypto");
    await (0, withdraw_2fa_1.assertWithdrawTwoFactor)(user.id, body === null || body === void 0 ? void 0 : body.twoFactorToken, ctx);
    (0, utils_1.assertTransfiConfig)();
    const settings = await (0, utils_3.getRampSettings)();
    if (!settings.offrampEnabled) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Selling crypto via TransFi is not enabled. Ask an administrator to turn it on.",
        });
    }
    (0, utils_3.assertCustodySupported)("offramp", settings.offrampCustody);
    const token = String((body === null || body === void 0 ? void 0 : body.token) || "").toUpperCase();
    const currency = String((body === null || body === void 0 ? void 0 : body.currency) || "").toUpperCase();
    const amount = Number(body === null || body === void 0 ? void 0 : body.amount);
    if (!token || !currency) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Token and currency are required" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid amount" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token");
    const tokens = await (0, utils_3.listTokens)("deposit");
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving payout method");
    const methods = await (0, utils_2.listPayoutMethods)(currency);
    if (!methods.length) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `TransFi cannot pay out ${currency}`,
        });
    }
    let method = methods[0];
    if (body === null || body === void 0 ? void 0 : body.paymentCode) {
        const found = methods.find((m) => m.paymentCode === body.paymentCode);
        if (!found) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Unsupported payout method. Available: ${methods.map((m) => m.paymentCode).join(", ")}`,
            });
        }
        method = found;
    }
    else if (methods.length > 1) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Choose a payout method: ${methods.map((m) => m.paymentCode).join(", ")}`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Resolving TransFi identity");
    const mirror = await (0, user_1.resolveOrCreateTransfiUser)(user.id, ((body === null || body === void 0 ? void 0 : body.payerDetails) || {}));
    if (mirror.kind === "needs_details") {
        return {
            success: false,
            status: "PAYER_DETAILS_REQUIRED",
            message: "TransFi requires a few more details before your first sale.",
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
    const bene = (body === null || body === void 0 ? void 0 : body.beneficiary) || {};
    const extras = {};
    for (const k of ["firstName", "lastName", "email", "phone", "phoneCode"]) {
        if (bene[k])
            extras[k] = String(bene[k]);
    }
    if (Object.keys(method.additionalDetails || {}).length && !extras.firstName) {
        const u = await db_1.models.user.findByPk(user.id);
        if (u === null || u === void 0 ? void 0 : u.firstName)
            extras.firstName = u.firstName;
        if (u === null || u === void 0 ? void 0 : u.lastName)
            extras.lastName = u.lastName;
        if (u === null || u === void 0 ? void 0 : u.email)
            extras.email = u.email;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Recording sale");
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
        description: `Sell ${amount} ${token} for ${currency} via TransFi`,
        metadata: JSON.stringify({
            gateway: "transfi",
            flow: "offramp",
            custody: settings.offrampCustody,
            token,
            network: match.network,
            currency,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
        }),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating TransFi offramp order");
    try {
        const order = await (0, utils_3.createOfframpOrder)({
            transfiUserId: mirror.transfiUserId,
            partnerId: record.id,
            sourceTicker: token,
            amount,
            destinationCurrency: currency,
            paymentCode: method.paymentCode,
            paymentType: method.paymentType,
            additionalPaymentDetails: Object.keys(extras).length ? extras : undefined,
            transactionId: record.id,
        });
        await record.update({
            metadata: JSON.stringify({
                gateway: "transfi",
                flow: "offramp",
                custody: settings.offrampCustody,
                token,
                network: order.cryptoNetwork || match.network,
                currency,
                paymentCode: method.paymentCode,
                paymentType: method.paymentType,
                transfiOrderId: order.orderId,
                depositAddress: order.walletAddress,
                payUrl: order.payUrl,
                cryptoAmount: order.cryptoAmount,
                fiatAmount: order.fiatAmount,
                feeData: order.feeData,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`TransFi offramp created: ${order.orderId}`);
        return {
            success: true,
            data: {
                order_id: order.orderId,
                transaction_id: record.id,
                depositAddress: order.walletAddress,
                network: order.cryptoNetwork || match.network,
                sendAmount: (_b = order.cryptoAmount) !== null && _b !== void 0 ? _b : amount,
                token,
                youReceive: order.fiatAmount,
                currency,
                fee: (_a = order.feeData) === null || _a === void 0 ? void 0 : _a.totalFee,
                checkout_url: order.payUrl,
                custody: settings.offrampCustody,
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
                    message: "Additional identity verification is required before this sale.",
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
                flow: "offramp",
                token,
                currency,
                error: error instanceof utils_1.TransfiError ? `${error.code}: ${error.message}` : String(error === null || error === void 0 ? void 0 : error.message),
                traceId: error instanceof utils_1.TransfiError ? error.traceId : undefined,
            }),
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`TransFi offramp failed: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({
            statusCode: error instanceof utils_1.TransfiError && error.statusCode < 500 ? 400 : 502,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Could not start the sale",
        });
    }
};
