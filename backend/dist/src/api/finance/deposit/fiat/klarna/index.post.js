"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
exports.metadata = {
    summary: "Creates a Klarna payment session",
    description: "Initiates a Klarna payment process by creating a payment session with Buy Now, Pay Later options. Supports multiple payment methods including Pay Now, Pay Later, and Pay in Installments.",
    operationId: "createKlarnaPayment",
    tags: ["Finance", "Deposit"],
    logModule: "KLARNA_DEPOSIT",
    logTitle: "Create Klarna payment session",
    requestBody: {
        description: "Payment information for Klarna session",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Payment amount in base currency units",
                        },
                        currency: {
                            type: "string",
                            description: "Currency code (e.g., USD, EUR, GBP)",
                        },
                        country: {
                            type: "string",
                            description: "Purchase country code (e.g., US, GB, DE)",
                            nullable: true,
                        },
                        payment_method: {
                            type: "string",
                            description: "Preferred Klarna payment method",
                            enum: ["pay_now", "pay_later", "pay_over_time"],
                            nullable: true,
                        },
                        customer: {
                            type: "object",
                            description: "Customer information",
                            properties: {
                                email: { type: "string", format: "email" },
                                phone: { type: "string" },
                                given_name: { type: "string" },
                                family_name: { type: "string" },
                                date_of_birth: { type: "string", format: "date" },
                            },
                            nullable: true,
                        },
                        billing_address: {
                            type: "object",
                            description: "Billing address information",
                            properties: {
                                given_name: { type: "string" },
                                family_name: { type: "string" },
                                email: { type: "string", format: "email" },
                                phone: { type: "string" },
                                street_address: { type: "string" },
                                postal_code: { type: "string" },
                                city: { type: "string" },
                                region: { type: "string" },
                                country: { type: "string" },
                            },
                            nullable: true,
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Klarna payment session created successfully. Returns session details and client token for frontend integration.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            session_id: {
                                type: "string",
                                description: "Klarna session ID",
                            },
                            client_token: {
                                type: "string",
                                description: "Client token for Klarna SDK",
                            },
                            payment_method_categories: {
                                type: "array",
                                description: "Available payment methods",
                                items: {
                                    type: "object",
                                    properties: {
                                        identifier: { type: "string" },
                                        name: { type: "string" },
                                        asset_urls: {
                                            type: "object",
                                            properties: {
                                                descriptive: { type: "string" },
                                                standard: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                            purchase_country: {
                                type: "string",
                                description: "Purchase country code",
                            },
                            purchase_currency: {
                                type: "string",
                                description: "Purchase currency code",
                            },
                            order_amount: {
                                type: "number",
                                description: "Total order amount in minor units",
                            },
                            reference: {
                                type: "string",
                                description: "Merchant reference for this payment",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request parameters",
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
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Klarna"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a;
    const { user, body, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { amount, currency, country, payment_method, customer, billing_address } = body;
    if (!amount || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Amount must be greater than 0" });
    }
    if (!(0, utils_1.validateCurrency)(currency)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by Klarna` });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
    const gateway = await db_1.models.depositGateway.findOne({
        where: { alias: "klarna", status: true },
    });
    if (!gateway) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment gateway not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Klarna gateway not found or disabled" });
    }
    if (!((_a = gateway.currencies) === null || _a === void 0 ? void 0 : _a.includes(currency))) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by Klarna gateway` });
    }
    let purchaseCountry = country;
    if (!purchaseCountry) {
        for (const [countryCode, currencies] of Object.entries(utils_1.KLARNA_COUNTRY_CURRENCY_MAP)) {
            if (currencies.includes(currency)) {
                purchaseCountry = countryCode;
                break;
            }
        }
    }
    if (!purchaseCountry) {
        throw (0, error_1.createError)({ statusCode: 400, message: `No supported country found for currency ${currency}` });
    }
    const supportedCurrencies = utils_1.KLARNA_COUNTRY_CURRENCY_MAP[purchaseCountry];
    if (!supportedCurrencies || !supportedCurrencies.includes(currency)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported in country ${purchaseCountry}` });
    }
    const locale = utils_1.KLARNA_LOCALE_MAP[purchaseCountry] || "en-US";
    const fixedFee = typeof gateway.fixedFee === 'number' ? gateway.fixedFee : 0;
    const percentageFee = typeof gateway.percentageFee === 'number' ? gateway.percentageFee : 0;
    const feeAmount = (amount * percentageFee) / 100 + fixedFee;
    const totalAmount = amount + feeAmount;
    const orderAmount = (0, utils_1.convertToKlarnaAmount)(totalAmount);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating fees");
    const taxAmount = (0, utils_1.convertToKlarnaAmount)(feeAmount);
    const merchantReference = (0, utils_1.generateKlarnaReference)();
    const orderLines = [
        {
            type: "physical",
            reference: "deposit",
            name: "Account Deposit",
            quantity: 1,
            unit_price: (0, utils_1.convertToKlarnaAmount)(amount),
            tax_rate: 0,
            total_amount: (0, utils_1.convertToKlarnaAmount)(amount),
            total_tax_amount: 0,
        },
    ];
    if (feeAmount > 0) {
        orderLines.push({
            type: "fee",
            reference: "processing_fee",
            name: "Processing Fee",
            quantity: 1,
            unit_price: (0, utils_1.convertToKlarnaAmount)(feeAmount),
            tax_rate: 0,
            total_amount: (0, utils_1.convertToKlarnaAmount)(feeAmount),
            total_tax_amount: 0,
        });
    }
    const baseUrl = `${publicUrl}${isProduction ? "" : ":3000"}`;
    const merchantUrls = {
        terms: `${baseUrl}/terms`,
        confirmation: `${baseUrl}/api/finance/deposit/fiat/klarna/verify?session_id={checkout.order.id}`,
        push: `${baseUrl}/api/finance/deposit/fiat/klarna/webhook`,
        authorization: `${baseUrl}/api/finance/deposit/fiat/klarna/authorize`,
    };
    const sessionData = {
        purchase_country: purchaseCountry,
        purchase_currency: currency,
        locale,
        order_amount: orderAmount,
        order_tax_amount: taxAmount,
        order_lines: orderLines,
        merchant_urls: merchantUrls,
        merchant_reference1: merchantReference,
        merchant_reference2: user.id,
        options: {
            allow_separate_shipping_address: false,
            date_of_birth_mandatory: false,
            title_mandatory: false,
            phone_mandatory: false,
            show_subtotal_detail: true,
            allowed_customer_types: ["person"],
            purchase_type: "buy",
        },
    };
    if (customer || user.email) {
        sessionData.customer = {
            type: "person",
            ...customer,
        };
        sessionData.billing_address = {
            given_name: (customer === null || customer === void 0 ? void 0 : customer.given_name) || user.firstName || "",
            family_name: (customer === null || customer === void 0 ? void 0 : customer.family_name) || user.lastName || "",
            email: (customer === null || customer === void 0 ? void 0 : customer.email) || user.email,
            country: purchaseCountry,
            ...billing_address,
        };
    }
    try {
        const { walletCreationService } = await Promise.resolve().then(() => __importStar(require('@b/services/wallet')));
        const walletResult = await walletCreationService.getOrCreateWallet(user.id, 'FIAT', currency);
        const wallet = walletResult.wallet;
        const response = await (0, utils_1.makeKlarnaRequest)("/payments/v1/sessions", "POST", sessionData);
        await db_1.models.transaction.create({
            userId: user.id,
            walletId: wallet.id,
            type: "DEPOSIT",
            amount: totalAmount,
            fee: feeAmount,
            referenceId: response.session_id,
            status: "PENDING",
            metadata: JSON.stringify({
                method: "KLARNA",
                currency: currency,
                session_id: response.session_id,
                merchant_reference: merchantReference,
                purchase_country: purchaseCountry,
                purchase_currency: currency,
                payment_method: payment_method || "auto",
                klarna_reference: response.klarna_reference,
            }),
            description: `Klarna deposit of ${amount} ${currency} initiated by ${user.firstName} ${user.lastName}`,
        });
        return {
            session_id: response.session_id,
            client_token: response.client_token,
            payment_method_categories: response.payment_method_categories,
            purchase_country: purchaseCountry,
            purchase_currency: currency,
            order_amount: orderAmount,
            reference: merchantReference,
            html_snippet: response.html_snippet,
        };
    }
    catch (error) {
        if (error instanceof utils_1.KlarnaError) {
            throw (0, error_1.createError)({ statusCode: 500, message: `Klarna payment session creation failed: ${error.message}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: `Failed to create Klarna payment session: ${error.message}` });
    }
};
