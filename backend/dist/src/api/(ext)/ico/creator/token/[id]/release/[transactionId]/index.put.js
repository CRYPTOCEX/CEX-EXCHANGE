"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const Middleware_1 = require("@b/handler/Middleware");
const crypto_1 = __importDefault(require("crypto"));
function validateTransactionHash(hash, blockchain) {
    const validators = {
        ethereum: /^0x[a-fA-F0-9]{64}$/,
        bsc: /^0x[a-fA-F0-9]{64}$/,
        polygon: /^0x[a-fA-F0-9]{64}$/,
        bitcoin: /^[a-fA-F0-9]{64}$/,
        solana: /^[1-9A-HJ-NP-Za-km-z]{87,88}$/,
    };
    const validator = validators[blockchain.toLowerCase()];
    return validator ? validator.test(hash) : true;
}
exports.metadata = {
    summary: "Submit Token Release Transaction Hash",
    description: "Submits the transaction hash after sending tokens to the investor and updates the token release status to VERIFICATION.",
    operationId: "submitTokenReleaseHash",
    tags: ["ICO", "Token", "Release"],
    requiresAuth: true,
    logModule: "ICO_RELEASE",
    logTitle: "Submit token release",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID of the token offering",
        },
        {
            index: 1,
            name: "transactionId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID of the ICO transaction",
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        releaseUrl: {
                            type: "string",
                            description: "Transaction hash or explorer URL"
                        },
                        gasUsed: {
                            type: "number",
                            description: "Gas used for the transaction (optional)"
                        },
                        blockNumber: {
                            type: "number",
                            description: "Block number of the transaction (optional)"
                        },
                    },
                    required: ["releaseUrl"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Token release transaction hash submitted successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            verificationId: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Not the offering owner" },
        404: { description: "Transaction not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    await Middleware_1.rateLimiters.general(data);
    const { user, params, body } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id: offeringId, transactionId } = params;
    const { releaseUrl, gasUsed, blockNumber } = body;
    if (!offeringId || !transactionId || !releaseUrl) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    const dbTransaction = await db_1.sequelize.transaction();
    try {
        const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, {
            include: [{
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    required: true,
                }],
            transaction: dbTransaction,
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
        }
        if (offering.userId !== user.id) {
            throw (0, error_1.createError)({ statusCode: 403, message: "You are not the owner of this offering" });
        }
        const icoTransaction = await db_1.models.icoTransaction.findOne({
            where: {
                id: transactionId,
                offeringId: offeringId
            },
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "email", "firstName", "lastName"],
                }],
            transaction: dbTransaction,
            lock: dbTransaction.LOCK.UPDATE,
        });
        if (!icoTransaction) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
        }
        if (icoTransaction.status !== 'PENDING') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot release tokens for transaction with status: ${icoTransaction.status}`
            });
        }
        let transactionHash = releaseUrl;
        if (releaseUrl.includes('etherscan.io') || releaseUrl.includes('bscscan.com') || releaseUrl.includes('polygonscan.com')) {
            const match = releaseUrl.match(/tx\/(0x[a-fA-F0-9]{64})/);
            if (match) {
                transactionHash = match[1];
            }
        }
        const blockchain = offering.tokenDetail.blockchain;
        if (!validateTransactionHash(transactionHash, blockchain)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid ${blockchain} transaction hash format`
            });
        }
        await icoTransaction.update({
            releaseUrl: releaseUrl,
            status: "VERIFICATION",
            notes: JSON.stringify({
                ...JSON.parse(icoTransaction.notes || '{}'),
                releaseData: {
                    transactionHash,
                    gasUsed,
                    blockNumber,
                    releasedAt: new Date().toISOString(),
                    releasedBy: user.id,
                }
            }),
        }, { transaction: dbTransaction });
        const verificationId = crypto_1.default.randomBytes(16).toString("hex");
        await db_1.models.icoAdminActivity.create({
            type: "TOKEN_RELEASE_SUBMITTED",
            offeringId: offering.id,
            offeringName: offering.name,
            adminId: user.id,
            details: JSON.stringify({
                transactionId: icoTransaction.id,
                investor: icoTransaction.user.email,
                tokenAmount: icoTransaction.amount,
                walletAddress: icoTransaction.walletAddress,
                releaseUrl,
                transactionHash,
                verificationId,
            }),
        }, { transaction: dbTransaction });
        await dbTransaction.commit();
        try {
            await (0, notifications_1.createNotification)({
                userId: icoTransaction.userId,
                relatedId: offeringId,
                type: "investment",
                title: "Token Release In Progress",
                message: "Your tokens are being released to your wallet.",
                details: `Transaction hash: ${transactionHash}\n` +
                    `Tokens: ${icoTransaction.amount} ${offering.symbol}\n` +
                    `Wallet: ${icoTransaction.walletAddress}\n` +
                    `Status: Awaiting blockchain confirmation`,
                link: `/ico/dashboard?tab=transactions`,
                actions: [
                    {
                        label: "View Transaction",
                        link: releaseUrl,
                        primary: true,
                    },
                    {
                        label: "View in Dashboard",
                        link: `/ico/dashboard?tab=transactions`,
                    },
                ],
            });
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: offeringId,
                type: "system",
                title: "Token Release Submitted",
                message: "Token release transaction submitted successfully.",
                details: `Investor: ${icoTransaction.user.firstName} ${icoTransaction.user.lastName}\n` +
                    `Tokens: ${icoTransaction.amount} ${offering.symbol}\n` +
                    `Transaction: ${transactionHash}`,
                link: `/ico/creator/token/${offeringId}/release`,
                actions: [
                    {
                        label: "View Release Dashboard",
                        link: `/ico/creator/token/${offeringId}/release`,
                        primary: true,
                    },
                ],
            });
        }
        catch (notifErr) {
            console.error("Failed to send notifications:", notifErr);
        }
        return {
            message: "Token release transaction submitted successfully.",
            verificationId,
        };
    }
    catch (err) {
        await dbTransaction.rollback();
        throw err;
    }
};
