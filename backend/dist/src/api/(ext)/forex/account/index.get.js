"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Retrieves all Forex accounts for the logged-in user",
    description: "Fetches all Forex accounts associated with the currently authenticated user.",
    operationId: "getForexAccounts",
    tags: ["Forex", "Accounts"],
    logModule: "FOREX",
    logTitle: "Get Forex Accounts",
    requiresAuth: true,
    responses: {
        200: {
            description: "Forex accounts retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: utils_1.baseForexAccountSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Forex Account"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Forex Accounts");
    const types = ["DEMO", "LIVE"];
    const accounts = {};
    try {
        const userAccounts = await db_1.models.forexAccount.findAll({
            where: {
                userId: user.id,
            },
            attributes: [
                "id",
                "accountId",
                "broker",
                "status",
                "type",
                "mt",
                "balance",
                "leverage",
                "password",
            ],
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "avatar"],
                },
                {
                    model: db_1.models.forexSignal,
                    as: "accountSignals",
                    through: {
                        attributes: [],
                    },
                },
            ],
        });
        const existingTypes = new Set(userAccounts.map((account) => account.type));
        for (const type of types) {
            if (!existingTypes.has(type)) {
                const account = await db_1.sequelize.transaction(async (t) => {
                    const unassignedAccount = await db_1.models.forexAccount.findOne({
                        where: {
                            userId: { [sequelize_1.Op.is]: null },
                            type: type,
                        },
                        lock: t.LOCK.UPDATE,
                        transaction: t,
                    });
                    if (unassignedAccount) {
                        await db_1.models.forexAccount.update({
                            userId: user.id,
                            status: true,
                        }, {
                            where: { id: unassignedAccount.id, userId: { [sequelize_1.Op.is]: null } },
                            transaction: t,
                        });
                        return await db_1.models.forexAccount.findByPk(unassignedAccount.id, {
                            transaction: t,
                        });
                    }
                    else {
                        return await db_1.models.forexAccount.create({
                            userId: user.id,
                            type: type,
                            status: false,
                            balance: 0,
                        }, { transaction: t });
                    }
                });
                accounts[type] = account;
            }
            else {
                accounts[type] = userAccounts.find((account) => account.type === type);
            }
        }
    }
    catch (error) {
        console.error(`An error occurred while upserting Forex accounts for userId: ${user.id}`, error);
        throw error;
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Forex Accounts fetched successfully");
    return accounts;
};
