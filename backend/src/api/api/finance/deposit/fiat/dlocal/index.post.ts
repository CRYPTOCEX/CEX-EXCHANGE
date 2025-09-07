import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  getDLocalConfig, 
  makeDLocalRequest, 
  validateCurrency, 
  COUNTRY_DOCUMENT_REQUIREMENTS,
  DLocalPaymentRequest,
  DLocalPaymentResponse,
  DLocalError
} from "./utils";
import { models } from "@b/db";

const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isProduction = process.env.NODE_ENV === "production";

export const metadata: OperationObject = {
  summary: "Creates a dLocal payment",
  description:
    "Initiates a dLocal payment process for emerging markets. Supports multiple payment methods including cards, bank transfers, cash payments, and digital wallets across 60+ countries.",
  operationId: "createDLocalPayment",
  tags: ["Finance", "Deposit"],
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
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("dLocal"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user) throw new Error("User not authenticated");

  const { 
    amount, 
    currency, 
    country, 
    payment_method_id = "CARD", 
    customer, 
    description = "Deposit" 
  } = body;

  // Validate currency support
  if (!validateCurrency(currency)) {
    throw new Error(`Currency ${currency} is not supported by dLocal`);
  }

  // Get gateway configuration
  const gateway = await models.depositGateway.findOne({
    where: { alias: "dlocal", status: true },
  });

  if (!gateway) {
    throw new Error("dLocal gateway not found or disabled");
  }

  if (!gateway.currencies?.includes(currency)) {
    throw new Error(`Currency ${currency} is not supported by dLocal gateway configuration`);
  }

  // Validate document requirements for the country
  const countryInfo = COUNTRY_DOCUMENT_REQUIREMENTS[country?.toUpperCase()];
  if (countryInfo?.required && !customer.document_id) {
    throw new Error(
      `Document ID is required for ${country}. Required: ${countryInfo.name} (${countryInfo.format})`
    );
  }

  // Calculate fees
  const { fixedFee, percentageFee } = gateway;
  const feeAmount = (amount * (percentageFee || 0)) / 100 + (fixedFee || 0);
  const totalAmount = amount + feeAmount;

  // Generate unique order ID
  const orderId = `DL-${Date.now()}-${user.id}`;

  try {
    // Create transaction record
    const transaction = await models.transaction.create({
      uuid: orderId,
      userId: user.id,
      type: "DEPOSIT",
      status: "PENDING",
      amount: amount,
      fee: feeAmount,
      description: description,
      metadata: {
        gateway: "dlocal",
        currency: currency,
        country: country,
        payment_method_id: payment_method_id,
        customer: customer,
      },
    });

    // Prepare dLocal payment request
    const paymentRequest: DLocalPaymentRequest = {
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

    // Create payment with dLocal
    const paymentResponse: DLocalPaymentResponse = await makeDLocalRequest(
      "/payments",
      "POST",
      paymentRequest
    );

    // Update transaction with dLocal payment ID
    await transaction.update({
      referenceId: paymentResponse.id,
      metadata: {
        ...transaction.metadata,
        dlocal_payment_id: paymentResponse.id,
        dlocal_status: paymentResponse.status,
        dlocal_status_code: paymentResponse.status_code,
        payment_method_type: paymentResponse.payment_method_type,
        payment_method_flow: paymentResponse.payment_method_flow,
      },
    });

    // Log the payment creation
    console.log(`dLocal payment created: ${paymentResponse.id} for user ${user.id}`);

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

  } catch (error) {
    console.error("dLocal payment creation error:", error);

    // Update transaction status to failed if it exists
    if (orderId) {
      try {
        await models.transaction.update(
          { 
            status: "FAILED",
            metadata: {
              error: error.message,
              timestamp: new Date().toISOString(),
            }
          },
          { where: { uuid: orderId } }
        );
      } catch (updateError) {
        console.error("Failed to update transaction status:", updateError);
      }
    }

    if (error instanceof DLocalError) {
      throw new Error(`dLocal API Error: ${error.message}`);
    }
    
    throw new Error(`Payment creation failed: ${error.message}`);
  }
}; 