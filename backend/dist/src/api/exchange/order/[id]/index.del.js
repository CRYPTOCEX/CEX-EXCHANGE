"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const index_get_1 = require("./index.get");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
const query_1 = require("@b/utils/query");
const utils_2 = require("@b/api/finance/wallet/utils");
const index_ws_1 = require("../index.ws");
const error_1 = require("@b/utils/error");
const utils_3 = require("../../utils");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const processPendingSpotOrders_1 = require("../util/processPendingSpotOrders");
const fill_math_1 = require("../util/fill-math");
exports.metadata = {
    summary: "Cancel Order",
    operationId: "cancelOrder",
    tags: ["Exchange", "Orders"],
    description: "Cancels a specific order for the authenticated user.",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the order to cancel.",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Order canceled successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                example: "Order canceled successfully",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Order"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    logModule: "EXCHANGE",
    logTitle: "Cancel exchange order",
};
const terminalStatuses = new Set(["closed", "filled", "canceled", "cancelled", "expired", "rejected"]);
exports.default = async ({ user, params, ctx }) => {
    if (!user?.id) throw (0, error_1.createError)(401, "Unauthorized");
    const order = await (0, index_get_1.getOrder)(params.id);
    if (!order) throw (0, error_1.createError)(404, "Order not found");
    if (order.userId !== user.id) throw (0, error_1.createError)(403, "Unauthorized");
    if (terminalStatuses.has(String(order.status).toLowerCase())) {
        return { message: "Order is already completed." };
    }
    const unblockTime = await (0, utils_3.loadBanStatus)();
    if (await (0, utils_3.handleBanStatus)(unblockTime))
        throw (0, error_1.createError)(503, "Exchange temporarily unavailable; order remains pending.");
    const exchange = await exchange_1.default.startExchange(ctx);
    if (!exchange) throw (0, error_1.createError)(503, "Service currently unavailable");
    const provider = await exchange_1.default.getProvider();
    const meta = (0, utils_1.metadataObject)(order.metadata);
    if (meta.venue && meta.venue !== provider)
        throw (0, error_1.createError)(409, "Order belongs to a different exchange; restore its provider before cancelling.");
    if (meta.reconcileBlocked)
        throw (0, error_1.createError)(409, "Order requires reconciliation before cancellation.");
    const fetchCurrent = async () => {
        const remote = exchange.has?.fetchOrder
            ? await exchange.fetchOrder(order.referenceId, order.symbol)
            : (await exchange.fetchOrders(order.symbol)).find(o => String(o.id) === String(order.referenceId));
        if (!remote || String(remote.id) !== String(order.referenceId))
            throw (0, error_1.createError)(503, "Unable to confirm order state; funds remain pending.");
        return remote;
    };
    try {
        let remote = await fetchCurrent();
        if (!terminalStatuses.has(String(remote.status).toLowerCase())) {
            // An acknowledgement (or a timeout) cannot establish the final filled amount.
            // Always read again: the order can fill while cancellation is in flight.
            try {
                await exchange.cancelOrder(order.referenceId, order.symbol);
            } catch (error) {
                console_1.logger.warn("EXCHANGE", `Cancel not confirmed for order ${order.id}; fetching current state`);
            }
            remote = await fetchCurrent();
        }
        if (!terminalStatuses.has(String(remote.status).toLowerCase()))
            throw (0, error_1.createError)(503, "Cancellation is not yet confirmed; order remains pending reconciliation.");
        const filled = Number(remote.filled);
        if (remote.filled == null || !Number.isFinite(filled) || filled < 0)
            throw (0, error_1.createError)(503, "Exchange returned an incomplete fill quantity; funds remain pending.");
        // Only the shared settlement transaction may publish a terminal local status.
        await (0, processPendingSpotOrders_1.settleSpotOrder)(order, remote, provider);
        const settled = await (0, index_get_1.getOrder)(order.id);
        if (!settled || !terminalStatuses.has(String(settled.status).toLowerCase()))
            throw (0, error_1.createError)(503, "Settlement is pending reconciliation; funds have not been released.");
        (0, index_ws_1.removeOrderFromTrackedOrders)(user.id, order.id);
        return { message: "Order completed on the exchange; funds have been settled." };
    } catch (error) {
        if (error.statusCode >= 400 && error.statusCode < 600) throw error;
        console_1.logger.error("EXCHANGE", `Cancellation reconciliation failed for order ${order.id}`, error);
        throw (0, error_1.createError)(503, "Unable to confirm cancellation settlement; order remains pending reconciliation.");
    }
};
