"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const messages_1 = require("@b/utils/support/messages");
const scope_1 = require("../scope");
exports.metadata = {
    summary: "The support desk queue, ordered by who is waiting",
    description: "Rows for the support console: one line per conversation with its last message, who spoke last, and how long it has been waiting. Scoped, sorted and paged in SQL.",
    operationId: "getSupportDeskInbox",
    tags: ["Admin", "CRM", "Support Ticket"],
    requiresAuth: true,
    permission: "view.support.ticket",
    parameters: [
        {
            index: 0,
            name: "scope",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["open", "waiting", "mine", "unassigned", "closed", "all"],
            },
            description: "Which conversations to list. Default `open` — everything except CLOSED.",
        },
        {
            index: 1,
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["PENDING", "OPEN", "REPLIED", "CLOSED"] },
            description: "Additionally narrow to one ticket status.",
        },
        {
            index: 2,
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Matches subject, customer name, customer email, assigned agent, or an exact ticket id.",
        },
        {
            index: 3,
            name: "sort",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: [
                    "queue",
                    "activity",
                    "created",
                    "importance",
                    "status",
                    "subject",
                    "customer",
                    "response",
                    "satisfaction",
                ],
            },
            description: "Sort key. Default `queue`.",
        },
        {
            index: 4,
            name: "order",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"] },
            description: "Direction. Omitted means each sort key's own natural direction.",
        },
        {
            index: 5,
            name: "page",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "1-based page. Clamped to the last page that has rows.",
        },
        {
            index: 6,
            name: "perPage",
            in: "query",
            required: false,
            schema: { type: "number" },
            description: "Rows per page, 5–200. Default 50. `limit` is an alias.",
        },
    ],
    responses: {
        200: { description: "Queue rows" },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    logModule: "ADMIN_CRM",
    logTitle: "Get Support Desk Queue",
    demoMask: ["items.customer.email"],
};
const STATUSES = new Set(["PENDING", "OPEN", "REPLIED", "CLOSED"]);
const OPEN_TICKET = "t.status <> 'CLOSED'";
const WAITING_ON_US = "(t.lastMessageFrom = 'client' OR t.lastMessageFrom IS NULL)";
const SCOPES = {
    open: OPEN_TICKET,
    waiting: `${OPEN_TICKET} AND ${WAITING_ON_US}`,
    mine: `${OPEN_TICKET} AND t.agentId = :me`,
    unassigned: `${OPEN_TICKET} AND t.agentId IS NULL`,
    closed: "t.status = 'CLOSED'",
    all: "1 = 1",
};
const QUEUE_RANK = `CASE
    WHEN t.status = 'CLOSED' THEN 2
    WHEN ${WAITING_ON_US}    THEN 0
    ELSE 1
  END`;
const IMPORTANCE_RANK = `CASE t.importance
    WHEN 'HIGH'   THEN 0
    WHEN 'MEDIUM' THEN 1
    ELSE 2
  END`;
const WAITING_SINCE = "COALESCE(t.lastMessageAt, t.createdAt)";
const CUSTOMER_NAME = "CONCAT_WS(' ', u.firstName, u.lastName)";
const SORTS = {
    queue: { expr: [QUEUE_RANK, WAITING_SINCE], order: "ASC" },
    activity: { expr: [WAITING_SINCE], order: "DESC" },
    created: { expr: ["t.createdAt"], order: "DESC" },
    importance: { expr: [IMPORTANCE_RANK, WAITING_SINCE], order: "ASC" },
    status: { expr: ["t.status", WAITING_SINCE], order: "ASC" },
    subject: { expr: ["t.subject"], order: "ASC" },
    customer: { expr: [CUSTOMER_NAME], order: "ASC" },
    response: {
        expr: ["t.responseTime IS NULL", "t.responseTime"],
        order: "ASC",
    },
    satisfaction: {
        expr: ["t.satisfaction IS NULL", "t.satisfaction"],
        order: "DESC",
    },
};
function previewOf(text) {
    const flat = String(text !== null && text !== void 0 ? text : "")
        .replace(/\s+/g, " ")
        .trim();
    return flat.length > 160 ? `${flat.slice(0, 159)}…` : flat;
}
function escapeLike(value) {
    return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
exports.default = async (data) => {
    var _a;
    const { query, ctx, user } = data;
    const me = String((user === null || user === void 0 ? void 0 : user.id) || "");
    const scopeKey = String((query === null || query === void 0 ? void 0 : query.scope) || "open").toLowerCase();
    const scope = SCOPES[scopeKey] ? scopeKey : "open";
    const sortKey = String((query === null || query === void 0 ? void 0 : query.sort) || "queue").toLowerCase();
    const sort = SORTS[sortKey] ? sortKey : "queue";
    const requestedOrder = String((query === null || query === void 0 ? void 0 : query.order) || "").toLowerCase();
    const direction = requestedOrder === "asc"
        ? "ASC"
        : requestedOrder === "desc"
            ? "DESC"
            : SORTS[sort].order;
    const perPage = Math.min(200, Math.max(5, Number(query === null || query === void 0 ? void 0 : query.perPage) || Number(query === null || query === void 0 ? void 0 : query.limit) || 50));
    const search = String((query === null || query === void 0 ? void 0 : query.search) || "").trim();
    const requestedStatus = (query === null || query === void 0 ? void 0 : query.status)
        ? String(query.status).toUpperCase()
        : null;
    const status = requestedStatus && STATUSES.has(requestedStatus) ? requestedStatus : null;
    const base = `FROM support_ticket t
       LEFT JOIN user u ON u.id = t.userId
       LEFT JOIN user a ON a.id = t.agentId
      WHERE t.deletedAt IS NULL
        AND ${scope_1.SUPPORT_QUEUE_SCOPE_SQL}`;
    const searchClause = search
        ? ` AND (t.subject LIKE :like
            OR ${CUSTOMER_NAME} LIKE :like
            OR u.email LIKE :like
            OR CONCAT_WS(' ', a.firstName, a.lastName) LIKE :like
            OR t.agentName LIKE :like
            OR t.id = :exact)`
        : "";
    const statusClause = status ? " AND t.status = :status" : "";
    const replacements = {
        me,
        ...(search ? { like: `%${escapeLike(search)}%`, exact: search } : {}),
        ...(status ? { status } : {}),
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Counting desk queue");
    const [totals] = await db_1.sequelize.query(`SELECT
        COUNT(*) AS allCount,
        COALESCE(SUM(CASE WHEN ${OPEN_TICKET} THEN 1 ELSE 0 END), 0) AS openCount,
        COALESCE(SUM(CASE WHEN t.status = 'CLOSED' THEN 1 ELSE 0 END), 0) AS closedCount,
        COALESCE(SUM(CASE WHEN ${OPEN_TICKET} AND ${WAITING_ON_US} THEN 1 ELSE 0 END), 0) AS waitingCount,
        COALESCE(SUM(CASE WHEN ${OPEN_TICKET} AND t.agentId = :me THEN 1 ELSE 0 END), 0) AS mineCount,
        COALESCE(SUM(CASE WHEN ${OPEN_TICKET} AND t.agentId IS NULL THEN 1 ELSE 0 END), 0) AS unassignedCount
       ${base}${statusClause}${searchClause}`, { replacements, type: sequelize_1.QueryTypes.SELECT });
    const counts = {
        open: Number(totals === null || totals === void 0 ? void 0 : totals.openCount) || 0,
        waiting: Number(totals === null || totals === void 0 ? void 0 : totals.waitingCount) || 0,
        mine: Number(totals === null || totals === void 0 ? void 0 : totals.mineCount) || 0,
        unassigned: Number(totals === null || totals === void 0 ? void 0 : totals.unassignedCount) || 0,
        closed: Number(totals === null || totals === void 0 ? void 0 : totals.closedCount) || 0,
        all: Number(totals === null || totals === void 0 ? void 0 : totals.allCount) || 0,
    };
    const total = (_a = counts[scope]) !== null && _a !== void 0 ? _a : 0;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(1, Number(query === null || query === void 0 ? void 0 : query.page) || 1), pages);
    const offset = (page - 1) * perPage;
    const orderBy = [...SORTS[sort].expr, "t.id"]
        .map((expr) => `${expr} ${direction}`)
        .join(", ");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading desk queue");
    const rows = total
        ? await db_1.sequelize.query(`SELECT t.id            AS id,
                t.subject       AS subject,
                t.status        AS status,
                t.importance    AS importance,
                t.type          AS type,
                t.agentId       AS agentId,
                t.agentName     AS agentName,
                t.messages      AS messages,
                t.responseTime  AS responseTime,
                t.satisfaction  AS satisfaction,
                t.lastMessageAt AS lastMessageAt,
                t.lastMessageFrom AS lastMessageFrom,
                ${WAITING_SINCE} AS waitingSince,
                t.createdAt     AS createdAt,
                t.updatedAt     AS updatedAt,
                u.id            AS customerId,
                u.firstName     AS customerFirstName,
                u.lastName      AS customerLastName,
                u.email         AS customerEmail,
                u.avatar        AS customerAvatar,
                a.firstName     AS agentFirstName,
                a.lastName      AS agentLastName,
                a.avatar        AS agentAvatar
           ${base}
            AND ${SCOPES[scope]}${statusClause}${searchClause}
          ORDER BY ${orderBy}
          LIMIT :perPage OFFSET :offset`, {
            replacements: { ...replacements, perPage, offset },
            type: sequelize_1.QueryTypes.SELECT,
        })
        : [];
    const now = Date.now();
    const items = rows.map((row) => {
        var _a, _b;
        const thread = (0, messages_1.readMessages)(row.messages).filter((m) => !m.system);
        const last = thread.length ? thread[thread.length - 1] : null;
        const closed = row.status === "CLOSED";
        const waitingOnUs = !closed && row.lastMessageFrom !== "agent";
        const since = new Date(row.waitingSince).getTime();
        return {
            id: row.id,
            subject: row.subject || "",
            status: row.status,
            importance: row.importance,
            type: row.type,
            agentId: row.agentId || null,
            agentName: [row.agentFirstName, row.agentLastName].filter(Boolean).join(" ") ||
                row.agentName ||
                null,
            agentAvatar: row.agentAvatar || null,
            customer: {
                id: row.customerId || null,
                name: [row.customerFirstName, row.customerLastName]
                    .filter(Boolean)
                    .join(" ") || "Customer",
                email: row.customerEmail || null,
                avatar: row.customerAvatar || null,
            },
            messageCount: thread.length,
            lastMessageFrom: row.lastMessageFrom || null,
            lastMessageAt: row.lastMessageAt || null,
            preview: previewOf(last === null || last === void 0 ? void 0 : last.text),
            waitingOnUs,
            waitingSince: row.waitingSince,
            ageMinutes: Number.isFinite(since)
                ? Math.max(0, Math.round((now - since) / 60000))
                : 0,
            responseTime: (_a = row.responseTime) !== null && _a !== void 0 ? _a : null,
            satisfaction: (_b = row.satisfaction) !== null && _b !== void 0 ? _b : null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${items.length} of ${total} conversations`);
    return {
        items,
        counts,
        total,
        page,
        pages,
        perPage,
        scope,
        sort,
        order: direction.toLowerCase(),
    };
};
