import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  getIpay88Config,
  validateCurrency, 
  generateIpay88Signature,
  convertToIpay88Amount,
  IPAY88_PAYMENT_METHODS,
  Ipay88Error
} from "./utils";
import { models } from "@b/db";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";

export const metadata: OperationObject = {
  summary: "Creates an iPay88 payment",
  description:
    "Initiates an iPay88 payment process for Southeast Asian markets. Supports multiple payment methods including credit cards, e-wallets, and online banking across Malaysia, Singapore, Thailand, Philippines, Indonesia, and Vietnam.",
  operationId: "createIpay88Payment",
  tags: ["Finance", "Payment"],
  requestBody: {
    description: "Payment information for iPay88 payment creation",
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
              description: "Currency code (e.g., MYR, SGD, THB, PHP, IDR, VND, USD, EUR, GBP, AUD)",
            },
            paymentMethod: {
              type: "string",
              description: "iPay88 payment method code (optional, defaults to show all available methods)",
              nullable: true,
            },
            description: {
              type: "string",
              description: "Payment description",
              nullable: true,
            },
            customerName: {
              type: "string",
              description: "Customer name",
              nullable: true,
            },
            customerEmail: {
              type: "string",
              description: "Customer email address",
              nullable: true,
            },
            customerPhone: {
              type: "string",
              description: "Customer phone number",
              nullable: true,
            },
            lang: {
              type: "string",
              description: "Payment page language (ISO-2 format: EN, CN, MY, TH, ID, VN)",
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
      description: "iPay88 payment created successfully",
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
                  payment_id: { type: "string" },
                  reference: { type: "string" },
                  status: { type: "string" },
                  gateway: { type: "string" },
                  amount: { type: "number" },
                  currency: { type: "string" },
                  signature: { type: "string" },
                  merchant_code: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad request - Invalid parameters",
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
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment gateway not found"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;

  if (!user) {
    throw new Error("User not found");
  }

  try {
    const { 
      amount, 
      currency, 
      paymentMethod, 
      description = "Payment",
      customerName,
      customerEmail,
      customerPhone,
      lang = "EN"
    } = body;

    // Validate required parameters
    if (!amount || amount <= 0) {
      throw new Error("Valid amount is required");
    }

    if (!currency) {
      throw new Error("Currency is required");
    }

    // Validate currency
    if (!validateCurrency(currency)) {
      throw new Error(`Currency ${currency} is not supported by iPay88`);
    }

    // Get iPay88 configuration
    const config = getIpay88Config();

    // Create transaction record
    const transaction = await models.transaction.create({
      uuid: require("crypto").randomUUID(),
      userId: user.id,
      type: "DEPOSIT",
      status: "PENDING",
      amount: amount,
      fee: 0, // iPay88 fees are typically charged by the gateway
      description: description,
      metadata: {
        gateway: "ipay88",
        currency: currency.toUpperCase(),
        payment_method: paymentMethod,
        customer_name: customerName || `${user.firstName} ${user.lastName}`,
        customer_email: customerEmail || user.email,
        customer_phone: customerPhone,
        language: lang,
      },
    });

    // Generate unique reference number
    const reference = `TXN-${transaction.uuid.replace(/-/g, "").substring(0, 16).toUpperCase()}`;

    // Convert amount to iPay88 format (cents)
    const ipay88Amount = convertToIpay88Amount(amount);

    // Generate payment signature
    const signature = generateIpay88Signature(
      config.merchantKey,
      config.merchantCode,
      reference,
      ipay88Amount,
      currency.toUpperCase()
    );

    // Prepare iPay88 payment request
    const paymentRequest: any = {
      MerchantCode: config.merchantCode,
      PaymentId: "1", // Payment ID (can be set to identify different payment types)
      RefNo: reference,
      Amount: ipay88Amount,
      Currency: currency.toUpperCase(),
      ProdDesc: description,
      UserName: customerName || `${user.firstName} ${user.lastName}`,
      UserEmail: customerEmail || user.email,
      UserContact: customerPhone || "",
      Remark: `Payment for ${description}`,
      Lang: lang,
      Signature: signature,
      ResponseURL: `${publicUrl}/api/finance/deposit/fiat/ipay88/verify`,
      BackendURL: `${publicUrl}/api/finance/deposit/fiat/ipay88/webhook`,
      SignatureType: "SHA256",
    };

    // Add payment method if specified
    if (paymentMethod && IPAY88_PAYMENT_METHODS[paymentMethod]) {
      paymentRequest.PaymentMethod = IPAY88_PAYMENT_METHODS[paymentMethod];
    }

    // Update transaction with iPay88 details
    await transaction.update({
      metadata: {
        ...transaction.metadata,
        ipay88_reference: reference,
        ipay88_payment_id: "1",
        ipay88_signature: signature,
        ipay88_request: paymentRequest,
      },
    });

    // Build payment URL with parameters
    const paymentUrl = new URL("/payment.htm", config.baseUrl);
    Object.entries(paymentRequest).forEach(([key, value]) => {
      if (value) {
        paymentUrl.searchParams.append(key, value.toString());
      }
    });

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        payment_url: paymentUrl.toString(),
        payment_id: "1",
        reference: reference,
        status: "PENDING",
        gateway: "ipay88",
        amount: amount,
        currency: currency.toUpperCase(),
        signature: signature,
        merchant_code: config.merchantCode,
        payment_methods: {
          credit_card: "Credit/Debit Cards",
          fpx: "FPX Online Banking",
          boost: "Boost eWallet",
          grabpay: "GrabPay",
          shopee_pay: "ShopeePay",
          touch_n_go: "Touch 'n Go eWallet",
          maybank_qr: "Maybank QR",
          alipay: "Alipay",
          wechat_pay: "WeChat Pay",
        },
      },
    };

  } catch (error) {
    console.error("iPay88 payment creation error:", error);
    
    if (error instanceof Ipay88Error) {
      throw new Error(`iPay88 Error: ${error.message}`);
    }
    
    throw new Error(error.message || "Failed to create iPay88 payment");
  }
}; 