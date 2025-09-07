import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

import { 
  makeDLocalRequest, 
  DLocalError 
} from "./utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get dLocal payment status",
  description: "Retrieve current payment status from dLocal API without updating local database",
  operationId: "getDLocalPaymentStatus",
  tags: ["Finance", "Status"],
  parameters: [
    {
      name: "payment_id",
      in: "query",
      description: "dLocal payment ID to check",
      schema: { type: "string" },
    },
    {
      name: "order_id",
      in: "query", 
      description: "Internal order ID to check",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Payment status retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              order_id: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string" },
              country: { type: "string" },
              status: { type: "string" },
              status_code: { type: "number" },
              status_detail: { type: "string" },
              payment_method_id: { type: "string" },
              payment_method_type: { type: "string" },
              payment_method_flow: { type: "string" },
              created_date: { type: "string" },
              approved_date: { type: "string", nullable: true },
              live: { type: "boolean" },
              payer: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  document: { type: "string" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Payment"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) throw new Error("User not authenticated");

  const { payment_id, order_id } = query;

  if (!payment_id && !order_id) {
    throw new Error("Either payment_id or order_id is required");
  }

  try {
    let dLocalPaymentId = payment_id;

    // If order_id provided, find the dLocal payment ID from transaction
    if (!dLocalPaymentId && order_id) {
      const transaction = await models.transaction.findOne({
        where: { uuid: order_id },
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      dLocalPaymentId = transaction.metadata?.dlocal_payment_id || transaction.referenceId;
      
      if (!dLocalPaymentId) {
        throw new Error("dLocal payment ID not found in transaction");
      }
    }

    // Query dLocal API for payment status
    const paymentData = await makeDLocalRequest(
      `/payments/${dLocalPaymentId}`,
      "GET"
    );

    console.log(`dLocal payment status check: ${dLocalPaymentId}, status: ${paymentData.status}`);

    return {
      id: paymentData.id,
      order_id: paymentData.order_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      country: paymentData.country,
      status: paymentData.status,
      status_code: paymentData.status_code,
      status_detail: paymentData.status_detail,
      payment_method_id: paymentData.payment_method_id,
      payment_method_type: paymentData.payment_method_type,
      payment_method_flow: paymentData.payment_method_flow,
      created_date: paymentData.created_date,
      approved_date: paymentData.approved_date,
      live: paymentData.live,
      payer: paymentData.payer,
    };

  } catch (error) {
    console.error("dLocal payment status check error:", error);

    if (error instanceof DLocalError) {
      throw new Error(`dLocal API Error: ${error.message}`);
    }
    
    throw new Error(`Payment status check failed: ${error.message}`);
  }
}; 