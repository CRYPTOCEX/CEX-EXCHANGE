"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.updateWalletBalance = updateWalletBalance;
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
const serial_1 = require("@b/services/wallet/serial");
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const sequelize_1 = require("sequelize");
const ledger_1 = require("@b/utils/pool-backing/ledger");
exports.metadata = {
    summary: "Updates the balance of a wallet",
    operationId: "updateWalletBalance",
    tags: ["Admin", "Wallets"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the wallet to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        description: "Data needed to update the wallet balance",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            description: "Type of balance update (ADD or SUBTRACT)",
                            enum: ["ADD", "SUBTRACT"],
                        },
                        amount: {
                            type: "number",
                            description: "Amount by which to update the wallet balance",
                        },
                        nonce: {
                            type: "string",
                            description: "Optional client-generated nonce to make this operation idempotent. A network retry with the same nonce will be de-duplicated; a fresh click should generate a new nonce.",
                        },
                        description: {
                            type: "string",
                            description: "Optional reason for the adjustment, stored on the ledger row.",
                        },
                        notifyUser: {
                            type: "boolean",
                            description: "Whether to email the wallet owner about the adjustment. Defaults to true.",
                        },
                    },
                    required: ["type", "amount"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Wallet"),
    requiresAuth: true,
    permission: "edit.wallet",
    logModule: "ADMIN_FIN",
    logTitle: "Update Wallet Balance",
};
exports.default = async (data) => {
    var _a;
    var _b;
    const { id } = data.params;
    const { type, amount, nonce, description, notifyUser } = data.body;
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating wallet balance");
    const { systemAccountNote } = await updateWalletBalance(id, type, amount, nonce, {
        description,
        notifyUser,
        adminUserId: (_b = (_a = data.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Wallet balance updated successfully");
    return {
        message: systemAccountNote
            ? `Wallet balance updated successfully. ${systemAccountNote}`
            : "Wallet balance updated successfully",
    };
};
async function updateWalletBalance(id, type, amount, nonce, options) {
    const adminReason = typeof (options === null || options === void 0 ? void 0 : options.description) === "string" && options.description.trim()
        ? options.description.trim()
        : undefined;
    const wallet = await db_1.models.wallet.findOne({
        where: { id },
    });
    if (!wallet)
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    const systemAccount = (0, system_accounts_1.systemAccountFor)(wallet.userId);
    const shouldNotify = (options === null || options === void 0 ? void 0 : options.notifyUser) !== false && !systemAccount;
    const systemAccountNote = systemAccount
        ? `This wallet belongs to the platform's own ${systemAccount.name} account. The adjustment is allowed` +
            (wallet.type === "ECO" || wallet.type === "SPOT"
                ? " and is booked on the pool-backing ledger as an admin obligation, so the figure stays explained;"
                : "; it changes the margin the maker can post, not the pool allocation it is checked against;") +
            " nothing is mailed or notified."
        : null;
    const user = await db_1.models.user.findOne({
        where: { id: wallet.userId },
    });
    if (!user)
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    if (type === "SUBTRACT" && wallet.balance < amount) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Insufficient funds in wallet" });
    }
    let scopeId;
    if (nonce) {
        scopeId = `nonce_${nonce}`;
    }
    else {
        const anchorMarker = `admin_adjust_anchor:${wallet.id}:${type}:${amount}`;
        const existingAnchor = await db_1.models.transaction.findOne({
            where: {
                status: "PENDING",
                userId: wallet.userId,
                walletId: wallet.id,
                metadata: { [sequelize_1.Op.like]: `%"anchor":"${anchorMarker}"%` },
            },
            attributes: ["id"],
        });
        if (existingAnchor) {
            scopeId = `anchor_${existingAnchor.id}`;
        }
        else {
            const anchor = await db_1.models.transaction.create({
                userId: wallet.userId,
                walletId: wallet.id,
                type: "ADJUSTMENT_ANCHOR",
                status: "PENDING",
                amount,
                fee: 0,
                description: `Admin ${type === "ADD" ? "credit" : "debit"} anchor (pending)`,
                metadata: JSON.stringify({ anchor: anchorMarker, adjustmentType: type }),
            });
            scopeId = `anchor_${anchor.id}`;
        }
    }
    const idempotencyKey = `admin_wallet_adjust_${id}_${type}_${amount}_${scopeId}`;
    const result = await (0, serial_1.withWalletSerial)([(0, serial_1.walletSerialKey)({ walletId: wallet.id })], () => db_1.sequelize.transaction(async (t) => {
        var _a;
        let written;
        if (type === "ADD") {
            written = await wallet_1.walletService.credit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount,
                operationType: "ADMIN_ADJUSTMENT_CREDIT",
                description: adminReason !== null && adminReason !== void 0 ? adminReason : `Admin added ${amount} ${wallet.currency} to wallet`,
                metadata: {
                    method: "ADMIN",
                    adjustmentType: "ADD",
                    ...(adminReason ? { reason: adminReason } : {}),
                },
                transaction: t,
            });
        }
        else {
            written = await wallet_1.walletService.debit({
                idempotencyKey,
                userId: wallet.userId,
                walletId: wallet.id,
                walletType: wallet.type,
                currency: wallet.currency,
                amount,
                operationType: "ADMIN_ADJUSTMENT_DEBIT",
                description: adminReason !== null && adminReason !== void 0 ? adminReason : `Admin subtracted ${amount} ${wallet.currency} from wallet`,
                metadata: {
                    method: "ADMIN",
                    adjustmentType: "SUBTRACT",
                    ...(adminReason ? { reason: adminReason } : {}),
                },
                transaction: t,
            });
        }
        await (0, ledger_1.recordAdminObligation)({
            walletType: wallet.type,
            currency: wallet.currency,
            amount: type === "ADD" ? amount : -amount,
            adjustmentTransactionId: written.transactionId,
            adminUserId: (_a = options === null || options === void 0 ? void 0 : options.adminUserId) !== null && _a !== void 0 ? _a : null,
            reason: adminReason !== null && adminReason !== void 0 ? adminReason : null,
            t,
        });
        return written;
    }));
    if (!nonce && scopeId.startsWith("anchor_")) {
        const anchorId = scopeId.slice("anchor_".length);
        await db_1.models.transaction.destroy({
            where: { id: anchorId, status: "PENDING" },
        });
    }
    const updatedWallet = await db_1.models.wallet.findOne({
        where: { id },
    });
    if (!updatedWallet)
        throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found" });
    if (shouldNotify) {
        await (0, emails_1.sendWalletBalanceUpdateEmail)(user, updatedWallet, type === "ADD" ? "added" : "subtracted", amount, result.newBalance);
    }
    return { systemAccountNote };
}
