"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
exports.metadata = {
    summary: "Creates a 2Checkout payment session",
    description: "Initiates a 2Checkout payment process by creating a payment session. This endpoint supports hosted checkout integration for web applications.",
    operationId: "create2CheckoutPayment",
    tags: ["Finance", "Deposit"],
    logModule: "2CHECKOUT_DEPOSIT",
    logTitle: "Create 2Checkout payment session",
    requestBody: {
        description: "Payment information for 2Checkout",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Payment amount in base currency unit",
                        },
                        currency: {
                            type: "string",
                            description: "Currency code (e.g., USD, EUR)",
                        },
                        customerInfo: {
                            type: "object",
                            description: "Customer billing information",
                            properties: {
                                firstName: { type: "string" },
                                lastName: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                address: { type: "string" },
                                city: { type: "string" },
                                state: { type: "string" },
                                zip: { type: "string" },
                                country: { type: "string" },
                            },
                            required: ["firstName", "lastName", "email", "address", "city", "zip", "country"],
                        },
                    },
                    required: ["amount", "currency", "customerInfo"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "2Checkout payment session created successfully. Returns checkout URL for redirect.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            checkoutUrl: {
                                type: "string",
                                description: "2Checkout hosted checkout URL",
                            },
                            orderReference: {
                                type: "string",
                                description: "Order reference for tracking",
                            },
                            sessionId: {
                                type: "string",
                                description: "2Checkout session ID",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("2Checkout"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { user, body, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    const { amount, currency, customerInfo } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
    const gateway = await db_1.models.depositGateway.findOne({
        where: { alias: "2checkout", status: true },
    });
    if (!gateway)
        throw (0, error_1.createError)({ statusCode: 404, message: "2Checkout gateway not found" });
    if (!((_a = gateway.currencies) === null || _a === void 0 ? void 0 : _a.includes(currency))) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by 2Checkout` });
    }
    const { fixedFee, percentageFee } = gateway;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating fees");
    const percentageFeeNum = typeof percentageFee === 'number' ? percentageFee : 0;
    const fixedFeeNum = typeof fixedFee === 'number' ? fixedFee : 0;
    const taxAmount = (amount * percentageFeeNum) / 100 + fixedFeeNum;
    const totalAmount = amount + taxAmount;
    const config = (0, utils_1.use2Checkout)();
    const apiUrl = (0, utils_1.get2CheckoutApiUrl)(config.isProduction);
    const orderReference = `deposit_${user.id}_${Date.now()}`;
    const orderRequest = {
        Country: customerInfo.country,
        Currency: currency,
        CustomerIP: "127.0.0.1",
        ExternalReference: orderReference,
        Language: "en",
        Source: config.accountReference || "API",
        BillingDetails: {
            Address1: customerInfo.address,
            City: customerInfo.city,
            CountryCode: customerInfo.country,
            Email: customerInfo.email,
            FirstName: customerInfo.firstName,
            LastName: customerInfo.lastName,
            Phone: customerInfo.phone || "",
            State: customerInfo.state || "",
            Zip: customerInfo.zip,
        },
        Items: [
            {
                Name: "Deposit",
                Description: `Deposit ${amount} ${currency}`,
                IsDynamic: true,
                Tangible: false,
                PurchaseType: "PRODUCT",
                Price: {
                    Amount: amount,
                    Type: "FIXED",
                },
                Quantity: 1,
            },
        ],
        PaymentDetails: {
            Type: "CC",
            Currency: currency,
            CustomerIP: "127.0.0.1",
        },
    };
    if (taxAmount > 0) {
        orderRequest.Items.push({
            Name: "Processing Fee",
            Description: `Processing fee for ${currency} deposit`,
            IsDynamic: true,
            Tangible: false,
            PurchaseType: "PRODUCT",
            Price: {
                Amount: taxAmount,
                Type: "FIXED",
            },
            Quantity: 1,
        });
    }
    try {
        const response = await fetch(`${apiUrl}/rest/6.0/orders/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Avangate-Authentication": `code="${config.merchantCode}" date="${new Date().toISOString()}" hash=""`,
            },
            body: JSON.stringify(orderRequest),
        });
        const result = await response.json();
        if (!response.ok || result.Errors) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `2Checkout API error: ${((_c = (_b = result.Errors) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.Message) || "Unknown error"}`
            });
        }
        const checkoutUrl = config.isProduction
            ? `https://secure.2checkout.com/checkout/buy?merchant=${config.merchantCode}&tco-currency=${currency}&tco-amount=${totalAmount}&external-reference=${orderReference}`
            : `https://sandbox.2checkout.com/checkout/buy?merchant=${config.merchantCode}&tco-currency=${currency}&tco-amount=${totalAmount}&external-reference=${orderReference}`;
        return {
            checkoutUrl,
            orderReference,
            sessionId: result.RefNo || result.OrderNo,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({ statusCode: 500, message: `Error creating 2Checkout session: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
    }
};
