"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Investors for Creator Offerings",
    description: "Retrieves aggregated investor details (including total amount invested, total tokens purchased, latest transaction date, rejected investment amount, and token info from the ICO offering) for ICO offerings created by the authenticated creator. Supports pagination, sorting, and searching. (Aggregation is done by computing valid transactions (PENDING/RELEASED) and rejected transactions separately.)",
    operationId: "getCreatorInvestors",
    tags: ["ICO", "Creator", "Investors"],
    logModule: "ICO",
    logTitle: "Get creator investors",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Page number",
        },
        {
            index: 1,
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Number of items per page",
        },
        {
            index: 2,
            name: "sortField",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Field to sort by. For associated fields use dot notation (e.g. 'user.firstName'). Defaults to 'lastTransactionDate'.",
        },
        {
            index: 3,
            name: "sortDirection",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Sort direction: asc or desc (default: desc)",
        },
        {
            index: 4,
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search query to filter by investor first or last name",
        },
    ],
    responses: {
        200: {
            description: "Investors retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { type: "object" },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    currentPage: { type: "number" },
                                    totalPages: { type: "number" },
                                    totalItems: { type: "number" },
                                    itemsPerPage: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator's offerings");
    const offerings = await db_1.models.icoTokenOffering.findAll({
        attributes: ["id"],
        where: { userId: user.id },
        raw: true,
    });
    const offeringIds = offerings.map((o) => o.id);
    if (offeringIds.length === 0) {
        return {
            items: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                itemsPerPage: 10,
            },
        };
    }
    const where = {
        offeringId: { [sequelize_1.Op.in]: offeringIds },
    };
    if (query.search) {
        const search = query.search.toLowerCase();
        where[sequelize_1.Op.and] = [
            {
                [sequelize_1.Op.or]: [
                    { "$user.firstName$": { [sequelize_1.Op.like]: `%${search}%` } },
                    { "$user.lastName$": { [sequelize_1.Op.like]: `%${search}%` } },
                ],
            },
        ];
    }
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const rawSortField = query.sortField || "lastTransactionDate";
    const sortDirection = query.sortDirection && query.sortDirection.toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";
    let orderCriteria;
    if (rawSortField.includes(".")) {
        const parts = rawSortField.split(".");
        if (parts[0] === "user") {
            orderCriteria = [
                [{ model: db_1.models.user, as: "user" }, parts[1], sortDirection],
            ];
        }
        else if (parts[0] === "offering") {
            orderCriteria = [
                [
                    { model: db_1.models.icoTokenOffering, as: "offering" },
                    parts[1],
                    sortDirection,
                ],
            ];
        }
        else {
            orderCriteria = [[rawSortField, sortDirection]];
        }
    }
    else {
        orderCriteria = [[rawSortField, sortDirection]];
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Aggregating investor data");
    const aggregated = await db_1.models.icoTransaction.findAll({
        attributes: [
            "userId",
            "offeringId",
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN icoTransaction.status IN ('PENDING', 'RELEASED') THEN icoTransaction.amount * icoTransaction.price ELSE 0 END")),
                "totalCost",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN icoTransaction.status = 'REJECTED' THEN icoTransaction.amount * icoTransaction.price ELSE 0 END")),
                "rejectedCost",
            ],
            [
                (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN icoTransaction.status IN ('PENDING', 'RELEASED') THEN icoTransaction.amount ELSE 0 END")),
                "totalTokens",
            ],
            [(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("icoTransaction.createdAt")), "lastTransactionDate"],
        ],
        include: [
            {
                model: db_1.models.user,
                as: "user",
                attributes: ["firstName", "lastName", "avatar"],
            },
            {
                model: db_1.models.icoTokenOffering,
                as: "offering",
                attributes: ["name", "symbol", "icon"],
            },
        ],
        where,
        group: ["userId", "offeringId", "user.id", "offering.id"],
        order: orderCriteria,
        raw: false,
    });
    const totalItems = aggregated.length;
    const totalPages = Math.ceil(totalItems / limit);
    const items = aggregated.slice(offset, offset + limit);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${items.length} investors (page ${page}/${totalPages})`);
    return {
        items,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
        },
    };
};
