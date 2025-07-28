// /server/api/admin/deposit/gateways/[id]/update.put.ts

import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { gatewayUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific deposit gateway",
  operationId: "updateDepositGateway",
  tags: ["Admin", "Deposit Gateways"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the deposit gateway to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the deposit gateway",
    content: {
      "application/json": {
        schema: gatewayUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Deposit Gateway"),
  requiresAuth: true,
  permission: "edit.deposit.gateway",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const {
    title,
    description,
    image,
    alias,
    currencies,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    status,
  } = body;

  // Ensure currencies is properly formatted as an array
  const formattedCurrencies = Array.isArray(currencies) ? currencies : 
    (typeof currencies === 'string' ? currencies.split(',').map(c => c.trim()) : null);

  // Ensure fee and limit values are properly formatted
  const formatFeeValue = (value: any) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Try to parse as number first
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
      
      // If not a number, try to parse as JSON (for object strings)
      try {
        const jsonParsed = JSON.parse(value);
        if (typeof jsonParsed === 'object' && jsonParsed !== null) return jsonParsed;
        return typeof jsonParsed === 'number' ? jsonParsed : 0;
      } catch {
        return 0;
      }
    }
    if (typeof value === 'object' && value !== null) return value;
    return 0;
  };

  return await updateRecord("depositGateway", id, {
    title,
    description,
    image,
    alias,
    currencies: formattedCurrencies,
    fixedFee: formatFeeValue(fixedFee),
    percentageFee: formatFeeValue(percentageFee),
    minAmount: formatFeeValue(minAmount),
    maxAmount: formatFeeValue(maxAmount),
    status,
  });
};
