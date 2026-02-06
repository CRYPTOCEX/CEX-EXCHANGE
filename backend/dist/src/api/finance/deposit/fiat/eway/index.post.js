"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";
exports.metadata = {
    summary: "Creates an eWAY payment",
    description: "Initiates an eWAY payment process for Asia-Pacific region. Supports multiple connection methods including Transparent Redirect, Direct Connection, and Responsive Shared Page.",
    operationId: "createEwayPayment",
    tags: ["Finance", "Payment"],
    logModule: "EWAY_DEPOSIT",
    logTitle: "Create eWAY payment",
    requestBody: {
        description: "eWAY payment creation request",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        amount: {
                            type: "number",
                            description: "Payment amount in smallest currency unit",
                            example: 10000,
                        },
                        currency: {
                            type: "string",
                            description: "Currency code (ISO 4217)",
                            example: "AUD",
                        },
                        method: {
                            type: "string",
                            description: "eWAY connection method",
                            enum: ["TransparentRedirect", "ResponsiveSharedPage", "Direct"],
                            default: "TransparentRedirect",
                        },
                        transaction_type: {
                            type: "string",
                            description: "Transaction type",
                            enum: ["Purchase", "MOTO", "Recurring"],
                            default: "Purchase",
                        },
                        customer: {
                            type: "object",
                            description: "Customer information",
                            properties: {
                                first_name: { type: "string" },
                                last_name: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                address: {
                                    type: "object",
                                    properties: {
                                        street1: { type: "string" },
                                        street2: { type: "string" },
                                        city: { type: "string" },
                                        state: { type: "string" },
                                        postal_code: { type: "string" },
                                        country: { type: "string", description: "2-letter country code" },
                                    },
                                },
                            },
                        },
                        invoice_number: {
                            type: "string",
                            description: "Invoice number for reference",
                        },
                        description: {
                            type: "string",
                            description: "Payment description",
                        },
                        return_url: {
                            type: "string",
                            description: "URL to redirect after successful payment",
                        },
                        cancel_url: {
                            type: "string",
                            description: "URL to redirect after cancelled payment",
                        },
                    },
                    required: ["amount", "currency"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "eWAY payment created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: { type: "boolean" },
                            data: {
                                type: "object",
                                properties: {
                                    transaction_id: { type: "string" },
                                    payment_url: { type: "string" },
                                    access_code: { type: "string" },
                                    status: { type: "string" },
                                    gateway: { type: "string" },
                                    amount: { type: "number" },
                                    currency: { type: "string" },
                                    reference: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request parameters",
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Transaction"),
        500: {
            description: "Internal server error",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message",
                            },
                        },
                    },
                },
            },
        },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "User not authenticated" });
    }
    try {
        const { amount, currency, method = "TransparentRedirect", transaction_type = "Purchase", customer = {}, invoice_number, description, return_url, cancel_url, } = body;
        if (!amount || amount <= 0) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Valid amount is required" });
        }
        if (!currency) {
            throw (0, error_1.createError)({ statusCode: 400, message: "Currency is required" });
        }
        if (!(0, utils_1.validateCurrency)(currency)) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by eWAY` });
        }
        const wallet = await db_1.models.wallet.findOne({
            where: { userId: user.id, currency: currency.toUpperCase() },
        });
        if (!wallet) {
            throw (0, error_1.createError)({ statusCode: 404, message: `Wallet not found for currency ${currency}` });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment gateway configuration");
        const gateway = await db_1.models.depositGateway.findOne({
            where: { alias: "eway", status: true },
        });
        if (!gateway) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Payment gateway not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "eWAY gateway is not available" });
        }
        if (!((_a = gateway.currencies) === null || _a === void 0 ? void 0 : _a.includes(currency.toUpperCase()))) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Currency ${currency} is not supported by eWAY gateway` });
        }
        const feePercentage = 0.029;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating fees");
        const fixedFee = currency.toUpperCase() === "AUD" ? 30 : 0;
        const calculatedFee = Math.round(amount * feePercentage) + fixedFee;
        const totalAmount = amount + calculatedFee;
        const reference = `EWAY_${Date.now()}_${user.id}`;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating transaction record");
        const transaction = await db_1.models.transaction.create({
            userId: user.id,
            walletId: wallet.id,
            type: "DEPOSIT",
            status: "PENDING",
            amount: amount,
            fee: calculatedFee,
            description: description || "eWAY deposit",
            metadata: JSON.stringify({
                gateway: "eway",
                method: method,
                transaction_type: transaction_type,
                currency: currency.toUpperCase(),
                reference: reference,
                invoice_number: invoice_number,
                customer: customer,
            }),
            referenceId: reference,
        });
        const ewayRequest = {
            Customer: {
                Reference: reference,
                FirstName: customer.first_name || "",
                LastName: customer.last_name || "",
                Email: customer.email || user.email || "",
                Phone: customer.phone || "",
                Street1: ((_b = customer.address) === null || _b === void 0 ? void 0 : _b.street1) || "",
                Street2: ((_c = customer.address) === null || _c === void 0 ? void 0 : _c.street2) || "",
                City: ((_d = customer.address) === null || _d === void 0 ? void 0 : _d.city) || "",
                State: ((_e = customer.address) === null || _e === void 0 ? void 0 : _e.state) || "",
                PostalCode: ((_f = customer.address) === null || _f === void 0 ? void 0 : _f.postal_code) || "",
                Country: ((_h = (_g = customer.address) === null || _g === void 0 ? void 0 : _g.country) === null || _h === void 0 ? void 0 : _h.toLowerCase()) || "au",
            },
            Payment: {
                TotalAmount: totalAmount,
                InvoiceNumber: invoice_number || reference,
                InvoiceDescription: description || "Payment via eWAY",
                InvoiceReference: reference,
                CurrencyCode: currency.toUpperCase(),
            },
            RedirectUrl: return_url || `${publicUrl}/finance/deposit/eway/success?ref=${reference}`,
            CancelUrl: cancel_url || `${publicUrl}/finance/deposit/eway/cancel?ref=${reference}`,
            Method: "ProcessPayment",
            TransactionType: utils_1.EWAY_TRANSACTION_TYPES[transaction_type.toUpperCase()] || "Purchase",
            DeviceID: "v5-platform",
            CustomerIP: "127.0.0.1",
        };
        if (method === "ResponsiveSharedPage") {
            const response = await (0, utils_1.makeEwayRequest)("/CreateAccessCode", "POST", ewayRequest);
            if (response.Errors) {
                throw new utils_1.EwayError("eWAY API Error", 400, { errors: response.Errors });
            }
            await transaction.update({
                metadata: JSON.stringify({
                    ...transaction.metadata,
                    eway_access_code: response.AccessCode,
                    eway_form_url: response.FormActionURL,
                }),
            });
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    payment_url: response.FormActionURL,
                    access_code: response.AccessCode,
                    status: "PENDING",
                    gateway: "eway",
                    amount: amount,
                    currency: currency.toUpperCase(),
                    reference: reference,
                    method: method,
                },
            };
        }
        else {
            const response = await (0, utils_1.makeEwayRequest)("/CreateAccessCodeShared", "POST", ewayRequest);
            if (response.Errors) {
                throw new utils_1.EwayError("eWAY API Error", 400, { errors: response.Errors });
            }
            await transaction.update({
                metadata: JSON.stringify({
                    ...transaction.metadata,
                    eway_access_code: response.AccessCode,
                    eway_form_url: response.FormActionURL,
                }),
            });
            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    payment_url: response.FormActionURL,
                    access_code: response.AccessCode,
                    status: "PENDING",
                    gateway: "eway",
                    amount: amount,
                    currency: currency.toUpperCase(),
                    reference: reference,
                    method: method,
                },
            };
        }
    }
    catch (error) {
        console_1.logger.error("EWAY", "Payment creation error", error);
        if (error instanceof utils_1.EwayError) {
            throw (0, error_1.createError)({ statusCode: 400, message: `eWAY Error: ${(error === null || error === void 0 ? void 0 : error.message) || String(error)}` });
        }
        throw (0, error_1.createError)({ statusCode: 500, message: (error === null || error === void 0 ? void 0 : error.message) || String(error) || "Failed to create eWAY payment" });
    }
};
