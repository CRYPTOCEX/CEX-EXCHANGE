"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const system_accounts_1 = require("@b/utils/system-accounts");
const constants_1 = require("@b/utils/constants");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const kyc_1 = require("@b/utils/kyc");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Lists users with pagination and optional filtering",
    operationId: "listUsers",
    tags: ["Admin", "CRM", "User"],
    parameters: constants_1.crudParameters,
    responses: {
        200: {
            description: "List of users with pagination information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: utils_1.userSchema,
                                },
                            },
                            pagination: constants_1.paginationSchema,
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Users"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.user",
    demoMask: ["items.email", "items.phone"],
};
exports.default = async (data) => {
    var _a;
    const { query, user } = data;
    const caller = (user === null || user === void 0 ? void 0 : user.id)
        ? await db_1.models.user.findByPk(user.id, {
            include: [{ model: db_1.models.role, as: "role", attributes: ["name"] }],
        })
        : null;
    const callerIsSuperAdmin = ((_a = caller === null || caller === void 0 ? void 0 : caller.role) === null || _a === void 0 ? void 0 : _a.name) === "Super Admin";
    if (query.all === "true") {
        const users = await db_1.models.user.findAll({
            attributes: {
                exclude: [
                    "password",
                    "metadata",
                ],
            },
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    attributes: ["id", "name"],
                },
            ],
            where: callerIsSuperAdmin
                ? undefined
                : { "$role.name$": { [sequelize_1.Op.ne]: "Super Admin" } },
        });
        return {
            data: users.map((row) => ({
                ...(typeof row.get === "function" ? row.get({ plain: true }) : row),
                system: (0, system_accounts_1.isSystemAccountId)(row.id),
            })),
            pagination: null,
        };
    }
    const result = await (0, query_1.getFiltered)({
        model: db_1.models.user,
        query,
        sortField: query.sortField || "createdAt",
        includeModels: [
            {
                model: db_1.models.role,
                as: "role",
                required: true,
                attributes: ["id", "name"],
            },
            {
                model: db_1.models.kycApplication,
                as: "kycApplications",
                required: false,
                attributes: ["id", "status", "reviewedAt", "createdAt"],
                includeModels: [
                    {
                        model: db_1.models.kycLevel,
                        as: "level",
                        required: false,
                        paranoid: false,
                        attributes: ["id", "name", "level", "features"],
                    },
                ],
            },
            {
                model: db_1.models.twoFactor,
                as: "twoFactor",
                required: false,
                attributes: ["id", "enabled", "type"],
            },
            {
                model: db_1.models.userBlock,
                as: "blocks",
                required: false,
                attributes: ["id", "isActive"],
            },
        ],
        excludeFields: [
            "password",
            "metadata",
        ],
        excludeRecords: callerIsSuperAdmin
            ? undefined
            : [
                {
                    model: db_1.models.role,
                    key: "name",
                    value: "Super Admin",
                },
            ],
    });
    if ((result === null || result === void 0 ? void 0 : result.items) && Array.isArray(result.items)) {
        for (const row of result.items) {
            row.system = (0, system_accounts_1.isSystemAccountId)(row.id);
            const apps = row.kycApplications || [];
            const eff = (0, kyc_1.getEffectiveKycStatus)(apps);
            const app = eff.effectiveApplication ||
                (apps.length > 0 ? apps[apps.length - 1] : null);
            row.kyc = app
                ? {
                    id: app.id,
                    status: app.status,
                    createdAt: app.createdAt,
                    kycLevel: eff.level,
                    isVerified: eff.isVerified,
                }
                : null;
        }
    }
    return result;
};
