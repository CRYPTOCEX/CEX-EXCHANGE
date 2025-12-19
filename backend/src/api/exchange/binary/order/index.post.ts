import { createError } from "@b/utils/error";
import { createRecordResponses } from "@b/utils/query";
import { BinaryOrderService } from "./util/BinaryOrderService";

const binaryStatus = process.env.NEXT_PUBLIC_BINARY_STATUS === "true";

export const metadata: OperationObject = {
  summary: "Create Binary Order",
  operationId: "createBinaryOrder",
  tags: ["Binary", "Orders"],
  description: "Creates a new binary order for the authenticated user.",
  requestBody: {
    description: "Binary order data to be created.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: { type: "string" },
            pair: { type: "string" },
            amount: { type: "number" },
            side: { type: "string" }, // now can be RISE, FALL, HIGHER, LOWER
            closedAt: { type: "string", format: "date-time" },
            durationId: { type: "string" }, // ID of the binary duration
            isDemo: { type: "boolean" },
            type: { type: "string" }, // RISE_FALL or HIGHER_LOWER
            // durationType: { type: "string" }, // TIME or TICKS
            // barrier: { type: "number" }, // required if type=HIGHER_LOWER
            // strikePrice: { type: "number" }, // required if type=CALL_PUT
            // payoutPerPoint: { type: "number" }, // required if type=CALL_PUT
          },
          required: ["currency", "pair", "amount", "side", "closedAt", "durationId", "type"],
        },
      },
    },
    required: true,
  },

  responses: createRecordResponses("Binary Order"),
  requiresAuth: true,
  logModule: "BINARY",
  logTitle: "Create binary order",
};

export default async (data: Handler) => {
  if (!binaryStatus) {
    throw createError({
      statusCode: 400,
      message: "Binary trading is disabled",
    });
  }

  const { user, body, ctx } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  // Validate request data
  const {
    currency,
    pair,
    amount,
    side,
    type,
    durationId,
    // durationType,
    // barrier,
    // strikePrice,
    // payoutPerPoint,
    closedAt,
    isDemo,
  } = body;

  try {
    ctx?.step("Validating order parameters");

    ctx?.step(`Checking wallet balance for ${pair}`);

    ctx?.step("Fetching market data and binary duration");

    ctx?.step(`Deducting ${amount} ${pair} from wallet`);

    ctx?.step("Fetching current market price");

    ctx?.step("Creating binary order record");
    const order = await BinaryOrderService.createOrder({
      userId: user.id,
      currency,
      pair,
      amount,
      side,
      type: "RISE_FALL",
      durationId,
      // durationType,
      // barrier,
      // strikePrice,
      // payoutPerPoint,
      closedAt,
      isDemo,
    });

    ctx?.step("Scheduling order expiry processing");

    ctx?.success(`Opened ${side} ${isDemo ? 'DEMO' : ''} position on ${currency}/${pair} for ${amount} ${pair}`);

    return {
      order,
      message: "Binary order created successfully",
    };
  } catch (error: any) {
    ctx?.fail(error.message || "Failed to create binary order");
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error.message || "An error occurred while creating the order",
    });
  }
};
