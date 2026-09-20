"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChartData = getChartData;
const sequelize_1 = require("sequelize");
const error_1 = require("./error");
const utils_1 = require("@b/api/finance/currency/utils");
const date_fns_1 = require("date-fns");
const AGG_OPS = new Set([
    "countWhere",
    "count",
    "sum",
    "avg",
    "min",
    "max",
    "countDistinct",
]);
const FILTER_OPS = {
    "=": "=",
    "!=": "<>",
    "<": "<",
    "<=": "<=",
    ">": ">",
    ">=": ">=",
};
const MAX_AGGREGATIONS = 60;
const SNAPSHOT_TOTAL = "__snapshotTotal";
const CATEGORICAL = ["blue", "green", "amber", "purple", "cyan", "red", "orange"];
function normalizeBoolean(v) {
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return v !== 0;
    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on" || s === "t")
            return true;
        if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off" || s === "f")
            return false;
    }
    return null;
}
function escapeValue(val) {
    if (val === null || val === undefined) {
        return "''";
    }
    if (typeof val === "number" && Number.isFinite(val)) {
        return String(val);
    }
    const str = String(val)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "''")
        .replace(/\0/g, "\\0");
    return "'" + str + "'";
}
function resolveColumn(model, field, qualifier) {
    const attributes = model.getAttributes();
    const attribute = Object.prototype.hasOwnProperty.call(attributes, field)
        ? attributes[field]
        : undefined;
    if (!attribute) {
        throw (0, error_1.createError)(400, `Unknown aggregation field '${field}' for model '${model.name}'`);
    }
    const column = attribute.field || field;
    const quoted = "`" + String(column).replace(/`/g, "``") + "`";
    if (!qualifier)
        return quoted;
    return "`" + String(qualifier).replace(/`/g, "``") + "`." + quoted;
}
function attributeType(model, field) {
    var _a;
    return (_a = model.getAttributes()[field]) === null || _a === void 0 ? void 0 : _a.type;
}
function isBooleanAttr(model, field) {
    const t = attributeType(model, field);
    return !!t && (t instanceof sequelize_1.DataTypes.BOOLEAN || t.key === "BOOLEAN");
}
function isDateAttr(model, field) {
    const t = attributeType(model, field);
    const key = t === null || t === void 0 ? void 0 : t.key;
    return (!!t &&
        (t instanceof sequelize_1.DataTypes.DATE ||
            t instanceof sequelize_1.DataTypes.DATEONLY ||
            key === "DATE" ||
            key === "DATEONLY"));
}
function invertOp(op) {
    switch (op) {
        case "=":
            return "<>";
        case "<>":
            return "=";
        case "<":
            return ">=";
        case "<=":
            return ">";
        case ">":
            return "<=";
        case ">=":
            return "<";
        default:
            return op;
    }
}
const INTERVAL_UNITS = {
    m: "MINUTE",
    min: "MINUTE",
    h: "HOUR",
    d: "DAY",
    w: "WEEK",
    mo: "MONTH",
    y: "YEAR",
};
function nowMinus(spec) {
    const m = /^(\d+)\s*(min|mo|[mhdwy])$/i.exec(String(spec).trim());
    if (!m) {
        throw (0, error_1.createError)(400, `Bad relative time '${spec}'. Use e.g. "15min", "24h", "30d", "6mo".`);
    }
    const amount = parseInt(m[1], 10);
    const unit = INTERVAL_UNITS[m[2].toLowerCase()];
    if (!Number.isFinite(amount) || amount < 0 || !unit) {
        throw (0, error_1.createError)(400, `Bad relative time '${spec}'`);
    }
    return `(NOW() - INTERVAL ${amount} ${unit})`;
}
function sqlPredicate(model, f, qualifier) {
    const col = resolveColumn(model, String(f.field), qualifier);
    const negate = f.negate === true;
    if (Array.isArray(f.values)) {
        const list = f.values;
        if (!list.length) {
            throw (0, error_1.createError)(400, `Filter on '${f.field}': \`values\` cannot be empty`);
        }
        const bool = isBooleanAttr(model, String(f.field));
        const rendered = list.map((v) => {
            if (v === null)
                return "NULL";
            if (bool) {
                const b = normalizeBoolean(v);
                if (b === null) {
                    throw (0, error_1.createError)(400, `Value '${String(v)}' is not a boolean for '${f.field}'`);
                }
                return b ? "1" : "0";
            }
            return escapeValue(v);
        });
        const hasNull = rendered.includes("NULL");
        const nonNull = rendered.filter((r) => r !== "NULL");
        const parts = [];
        if (nonNull.length)
            parts.push(col + (negate ? " NOT IN (" : " IN (") + nonNull.join(", ") + ")");
        if (hasNull)
            parts.push(col + (negate ? " IS NOT NULL" : " IS NULL"));
        return "(" + parts.join(negate ? " AND " : " OR ") + ")";
    }
    if (typeof f.value === "object" && f.value !== null && "ago" in f.value) {
        if (!isDateAttr(model, String(f.field))) {
            throw (0, error_1.createError)(400, `Relative filter on '${f.field}', which is not a date column`);
        }
        const op = FILTER_OPS[f.op || "<"];
        if (!op)
            throw (0, error_1.createError)(400, `Unsupported filter operator '${f.op}'`);
        return col + " " + (negate ? invertOp(op) : op) + " " + nowMinus(String(f.value.ago));
    }
    if (f.value === null || f.value === undefined) {
        return col + (negate ? " IS NOT NULL" : " IS NULL");
    }
    const op = FILTER_OPS[f.op || "="];
    if (!op)
        throw (0, error_1.createError)(400, `Unsupported filter operator '${f.op}'`);
    const effective = negate ? invertOp(op) : op;
    if (typeof f.value === "object" && f.value !== null && "column" in f.value) {
        const other = resolveColumn(model, String(f.value.column));
        return col + " " + effective + " " + other;
    }
    if (isBooleanAttr(model, String(f.field))) {
        const b = normalizeBoolean(f.value);
        if (b === null) {
            throw (0, error_1.createError)(400, `Value '${String(f.value)}' is not a boolean for column '${f.field}'`);
        }
        return col + " " + effective + " " + (b ? "1" : "0");
    }
    return col + " " + effective + " " + escapeValue(f.value);
}
function aggregateOperand(model, agg, qualifier) {
    if (agg.since) {
        if (!isDateAttr(model, agg.field)) {
            throw (0, error_1.createError)(400, `Aggregation '${agg.alias}': \`since\` needs a date column, '${agg.field}' is not one`);
        }
        const unit = INTERVAL_UNITS[String(agg.since.unit || "d").toLowerCase()];
        if (!unit) {
            throw (0, error_1.createError)(400, `Aggregation '${agg.alias}': bad \`since.unit\``);
        }
        const from = resolveColumn(model, agg.field, qualifier);
        const to = agg.since.until
            ? resolveColumn(model, String(agg.since.until), qualifier)
            : "NOW()";
        return `TIMESTAMPDIFF(${unit}, ${from}, ${to})`;
    }
    if (agg.multiplyBy) {
        return ("(" +
            resolveColumn(model, agg.field, qualifier) +
            " * " +
            resolveColumn(model, agg.multiplyBy, qualifier) +
            ")");
    }
    return resolveColumn(model, agg.field, qualifier);
}
function buildAggregateSql(model, agg, qualifier) {
    var _a, _b;
    const op = (_a = agg.op) !== null && _a !== void 0 ? _a : "countWhere";
    const guards = ((_b = agg.where) !== null && _b !== void 0 ? _b : []).map((w) => sqlPredicate(model, w, qualifier));
    if (op === "countWhere") {
        if (!agg.field) {
            throw (0, error_1.createError)(400, `Aggregation '${agg.alias}': field is required`);
        }
        guards.unshift(sqlPredicate(model, { field: agg.field, value: agg.value }));
        return "SUM(CASE WHEN " + guards.join(" AND ") + " THEN 1 ELSE 0 END)";
    }
    if (!agg.field) {
        throw (0, error_1.createError)(400, `Aggregation '${agg.alias}': field is required for ${op}`);
    }
    const col = aggregateOperand(model, agg, qualifier);
    const guarded = guards.length
        ? "CASE WHEN " + guards.join(" AND ") + " THEN " + col + " END"
        : col;
    switch (op) {
        case "count":
            return "COUNT(" + guarded + ")";
        case "sum":
            return "SUM(" + guarded + ")";
        case "avg":
            return "AVG(" + guarded + ")";
        case "min":
            return "MIN(" + guarded + ")";
        case "max":
            return "MAX(" + guarded + ")";
        case "countDistinct":
            return "COUNT(DISTINCT " + guarded + ")";
        default:
            throw (0, error_1.createError)(400, `Unknown aggregation op '${op}'`);
    }
}
function buildAttributes(model, aggregations, dateExpr) {
    const attributes = [];
    if (dateExpr) {
        attributes.push([sequelize_1.Sequelize.literal(dateExpr), "dateGroup"]);
    }
    attributes.push([sequelize_1.Sequelize.literal("COUNT(*)"), "total"]);
    aggregations.forEach((agg) => {
        var _a;
        attributes.push([sequelize_1.Sequelize.literal(buildAggregateSql(model, agg)), agg.alias]);
        if (agg.op === "avg" && agg.field) {
            const col = aggregateOperand(model, agg);
            const guards = ((_a = agg.where) !== null && _a !== void 0 ? _a : []).map((w) => sqlPredicate(model, w));
            const wrap = guards.length
                ? "CASE WHEN " + guards.join(" AND ") + " THEN " + col + " END"
                : col;
            attributes.push([sequelize_1.Sequelize.literal("SUM(" + wrap + ")"), "__" + agg.alias + "__sum"]);
            attributes.push([sequelize_1.Sequelize.literal("COUNT(" + wrap + ")"), "__" + agg.alias + "__cnt"]);
        }
    });
    return attributes;
}
function normalizeOp(a, id) {
    var _a;
    const raw = (_a = a === null || a === void 0 ? void 0 : a.op) !== null && _a !== void 0 ? _a : a === null || a === void 0 ? void 0 : a.aggregationType;
    if (raw) {
        if (!AGG_OPS.has(raw))
            throw (0, error_1.createError)(400, `KPI '${id}': unknown aggregation op '${raw}'`);
        return raw;
    }
    return (a === null || a === void 0 ? void 0 : a.value) !== undefined && (a === null || a === void 0 ? void 0 : a.value) !== null ? "countWhere" : "count";
}
function extractAggregations(model, charts, kpis) {
    const aggregations = [];
    const derived = [];
    const errors = [];
    kpis.forEach((kpi) => {
        try {
            const d = kpi.derived;
            if (d) {
                if (!Array.isArray(d.of) || !d.of.length) {
                    throw (0, error_1.createError)(400, `KPI '${kpi.id}': derived.of must list at least one alias`);
                }
                derived.push({
                    alias: kpi.metric,
                    op: d.op,
                    of: d.of.map(String),
                    fallback: Number(d.fallback) || 0,
                });
                return;
            }
            const a = kpi.aggregation;
            if (!a)
                return;
            const op = normalizeOp(a, kpi.id);
            if (!a.field)
                throw (0, error_1.createError)(400, `KPI '${kpi.id}': aggregation.field is required`);
            if (op === "countWhere" && a.value === undefined) {
                throw (0, error_1.createError)(400, `KPI '${kpi.id}': countWhere needs aggregation.value`);
            }
            resolveColumn(model, String(a.field));
            if (a.multiplyBy)
                resolveColumn(model, String(a.multiplyBy));
            if (a.inUSD) {
                resolveDenomColumn(model, String(a.inUSD));
                if (op !== "sum") {
                    throw (0, error_1.createError)(400, `KPI '${kpi.id}': \`inUSD\` denominates a total, so it needs \`op: "sum"\` (got '${op}').`);
                }
            }
            aggregations.push({
                alias: kpi.metric,
                field: String(a.field),
                value: op === "countWhere" ? a.value : undefined,
                op,
                where: Array.isArray(a.where) ? a.where : undefined,
                multiplyBy: a.multiplyBy ? String(a.multiplyBy) : undefined,
                since: a.since ? { unit: a.since.unit, until: a.since.until } : undefined,
                inUSD: a.inUSD ? String(a.inUSD) : undefined,
                scope: kpi.valueMode === "current" ? "all" : "window",
            });
        }
        catch (err) {
            errors.push({ id: kpi.id, message: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
        }
    });
    const claimedPlain = new Set(kpis.map((k) => String(k.metric)));
    charts.forEach((chart) => {
        var _a;
        try {
            if (chart.type === "pie" && ((_a = chart.config) === null || _a === void 0 ? void 0 : _a.field) && Array.isArray(chart.config.status)) {
                const field = String(chart.config.field);
                resolveColumn(model, field);
                chart.config.status.forEach((statusMapping) => {
                    const raw = String(statusMapping.value);
                    aggregations.push({
                        alias: `${chart.id}__${raw}`,
                        field,
                        value: statusMapping.value,
                        op: "countWhere",
                        scope: "window",
                    });
                    if (!claimedPlain.has(raw)) {
                        claimedPlain.add(raw);
                        aggregations.push({
                            alias: raw,
                            field,
                            value: statusMapping.value,
                            op: "countWhere",
                            scope: "window",
                        });
                    }
                });
            }
        }
        catch (err) {
            errors.push({ id: chart.id, message: (err === null || err === void 0 ? void 0 : err.message) || String(err) });
        }
    });
    const byAlias = new Map();
    for (const agg of aggregations) {
        const prev = byAlias.get(agg.alias);
        if (prev) {
            if (JSON.stringify(prev) !== JSON.stringify(agg)) {
                errors.push({
                    id: agg.alias,
                    message: `Two different aggregations claim the alias '${agg.alias}'. ` +
                        `Give each KPI its own \`metric\`.`,
                });
            }
            continue;
        }
        byAlias.set(agg.alias, agg);
    }
    const unique = Array.from(byAlias.values());
    if (unique.length > MAX_AGGREGATIONS) {
        throw (0, error_1.createError)(400, `This page asks for ${unique.length} aggregations; the limit is ${MAX_AGGREGATIONS}.`);
    }
    return { aggregations: unique, derived, errors };
}
function evalDerived(d, get) {
    const v = d.of.map(get);
    switch (d.op) {
        case "ratio":
            return v[1] ? v[0] / v[1] : d.fallback;
        case "percent":
            return v[1] ? (v[0] / v[1]) * 100 : d.fallback;
        case "diff":
            return v.slice(1).reduce((a, b) => a - b, v[0]);
        case "sum":
            return v.reduce((a, b) => a + b, 0);
        case "product":
            return v.reduce((a, b) => a * b, 1);
        default:
            return d.fallback;
    }
}
function bucketExpr(col, bucket) {
    switch (bucket) {
        case "hour":
            return `DATE_FORMAT(${col}, '%Y-%m-%d %H:00:00')`;
        case "day":
            return `DATE_FORMAT(${col}, '%Y-%m-%d 00:00:00')`;
        case "month":
            return `DATE_FORMAT(${col}, '%Y-%m-01 00:00:00')`;
        case "week":
            return `DATE_FORMAT(DATE_SUB(${col}, INTERVAL DAYOFWEEK(${col}) - 1 DAY), '%Y-%m-%d 00:00:00')`;
    }
}
function startOfBucket(d, bucket) {
    switch (bucket) {
        case "hour":
            return (0, date_fns_1.startOfHour)(d);
        case "day":
            return (0, date_fns_1.startOfDay)(d);
        case "week":
            return (0, date_fns_1.startOfWeek)(d);
        case "month":
            return (0, date_fns_1.startOfMonth)(d);
    }
}
function addBuckets(d, bucket, n) {
    switch (bucket) {
        case "hour":
            return (0, date_fns_1.addHours)(d, n);
        case "day":
            return (0, date_fns_1.addDays)(d, n);
        case "week":
            return (0, date_fns_1.addWeeks)(d, n);
        case "month":
            return (0, date_fns_1.addMonths)(d, n);
    }
}
function resolveWindow(timeframe, mode) {
    const now = new Date();
    let start;
    let end;
    let bucket;
    const tf = timeframe === "y" ? "1y" : timeframe;
    if (mode === "calendar") {
        switch (tf) {
            case "24h":
                start = (0, date_fns_1.startOfDay)(now);
                end = (0, date_fns_1.endOfDay)(now);
                bucket = "hour";
                break;
            case "7d":
                start = (0, date_fns_1.startOfWeek)(now);
                end = (0, date_fns_1.endOfWeek)(now);
                bucket = "day";
                break;
            case "30d":
                start = (0, date_fns_1.startOfMonth)(now);
                end = (0, date_fns_1.endOfMonth)(now);
                bucket = "day";
                break;
            case "3m":
                start = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 2));
                end = (0, date_fns_1.endOfMonth)(now);
                bucket = "week";
                break;
            case "6m":
                start = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 5));
                end = (0, date_fns_1.endOfMonth)(now);
                bucket = "month";
                break;
            default:
                start = (0, date_fns_1.startOfMonth)(new Date(now.getFullYear(), 0, 1));
                end = (0, date_fns_1.endOfMonth)(new Date(now.getFullYear(), 11, 1));
                bucket = "month";
                break;
        }
    }
    else {
        end = now;
        switch (tf) {
            case "24h":
                bucket = "hour";
                start = (0, date_fns_1.startOfHour)((0, date_fns_1.subHours)(now, 23));
                break;
            case "7d":
                bucket = "day";
                start = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 6));
                break;
            case "30d":
                bucket = "day";
                start = (0, date_fns_1.startOfDay)((0, date_fns_1.subDays)(now, 29));
                break;
            case "3m":
                bucket = "week";
                start = (0, date_fns_1.startOfWeek)((0, date_fns_1.subMonths)(now, 3));
                break;
            case "6m":
                bucket = "month";
                start = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 5));
                break;
            default:
                bucket = "month";
                start = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, 11));
                break;
        }
    }
    const slots = [];
    let cursor = startOfBucket(start, bucket);
    const limit = startOfBucket(end, bucket);
    let guard = 0;
    while (cursor <= limit && guard++ < 1000) {
        slots.push(cursor);
        cursor = addBuckets(cursor, bucket, 1);
    }
    return { start, end, bucket, slots };
}
const MAX_GROUPBY_QUERIES = 4;
const LABEL_COLUMNS = ["name", "title", "displayName", "symbol", "label", "slug", "email"];
async function resolveGroupLabels(model, groupBy, rows, labelFieldOverride) {
    try {
        const assoc = Object.values(model.associations || {}).find((a) => a.associationType === "BelongsTo" && a.foreignKey === groupBy);
        if (!(assoc === null || assoc === void 0 ? void 0 : assoc.target))
            return;
        const target = assoc.target;
        const cols = Object.keys(target.getAttributes());
        const labelCol = labelFieldOverride && cols.includes(labelFieldOverride)
            ? labelFieldOverride
            : LABEL_COLUMNS.find((c) => cols.includes(c));
        if (!labelCol)
            return;
        const pk = assoc.targetKey || target.primaryKeyAttribute || "id";
        const keys = rows.map((r) => r.id).filter((k) => k !== "—" && k !== "__other__");
        if (!keys.length)
            return;
        const found = (await target.findAll({
            where: { [pk]: keys },
            attributes: [pk, labelCol],
            include: [],
            raw: true,
        }));
        const byKey = new Map(found.map((f) => [String(f[pk]), f[labelCol]]));
        for (const row of rows) {
            const label = byKey.get(row.id);
            if (label !== undefined && label !== null && String(label).trim() !== "") {
                row.name = String(label);
            }
        }
    }
    catch (_a) {
    }
}
async function fetchTopN(model, chart, win, dateField, additionalWhere, windowed) {
    const cfg = chart.config;
    const groupCol = resolveColumn(model, String(cfg.groupBy));
    const limit = Math.min(Math.max(Number(cfg.limit) || 5, 1), 25);
    const measureSql = cfg.measure
        ? buildAggregateSql(model, {
            alias: "measure",
            field: cfg.measure.field,
            value: cfg.measure.value,
            op: (cfg.measure.op || cfg.measure.aggregationType),
            where: cfg.measure.where,
            multiplyBy: cfg.measure.multiplyBy,
        })
        : "COUNT(*)";
    const where = { ...additionalWhere };
    if (windowed)
        where[dateField] = { [sequelize_1.Op.between]: [win.start, win.end] };
    const rows = (await model.findAll({
        where: where,
        attributes: [
            [sequelize_1.Sequelize.literal(groupCol), "groupKey"],
            [sequelize_1.Sequelize.literal(measureSql), "measure"],
        ],
        group: [sequelize_1.Sequelize.literal(groupCol)],
        order: [[sequelize_1.Sequelize.literal("measure"), "DESC"]],
        limit: limit + 1,
        include: [],
        raw: true,
    }));
    const mapped = rows.map((r) => ({
        id: r.groupKey === null || r.groupKey === undefined ? "—" : String(r.groupKey),
        name: r.groupKey === null || r.groupKey === undefined ? "Unspecified" : String(r.groupKey),
        value: toNumber(r.measure),
    }));
    await resolveGroupLabels(model, String(cfg.groupBy), mapped, cfg.labelField);
    if (mapped.length <= limit)
        return mapped;
    const head = mapped.slice(0, limit);
    const totalRow = await model.findOne({
        where: where,
        attributes: [[sequelize_1.Sequelize.literal(measureSql), "measure"]],
        include: [],
        raw: true,
    });
    const grand = toNumber(totalRow === null || totalRow === void 0 ? void 0 : totalRow.measure);
    const shown = head.reduce((s, x) => s + x.value, 0);
    const rest = grand - shown;
    if (rest > 0)
        head.push({ id: "__other__", name: "Other", value: rest });
    return head;
}
async function fetchWindowedExact(model, win, dateField, aggregations, additionalWhere) {
    const exact = aggregations.filter((a) => a.op === "countDistinct");
    if (!exact.length)
        return {};
    const rows = await model.findAll({
        where: {
            [dateField]: { [sequelize_1.Op.between]: [win.start, win.end] },
            ...additionalWhere,
        },
        attributes: buildAttributes(model, exact, null),
        include: [],
        raw: true,
    });
    const row = rows[0] || {};
    const out = {};
    for (const agg of exact)
        out[agg.alias] = toNumber(row[agg.alias]);
    return out;
}
async function fetchBuckets(model, win, dateCol, dateField, aggregations, additionalWhere) {
    const whereClause = {
        [dateField]: { [sequelize_1.Op.between]: [win.start, win.end] },
        ...additionalWhere,
    };
    const rows = await model.findAll({
        where: whereClause,
        attributes: buildAttributes(model, aggregations, bucketExpr(dateCol, win.bucket)),
        group: ["dateGroup"],
        include: [],
        raw: true,
    });
    return rows
        .map((r) => {
        const dp = {
            date: new Date(r.dateGroup),
            total: Number(r.total) || 0,
        };
        for (const agg of aggregations) {
            dp[agg.alias] = toNumber(r[agg.alias]);
            if (agg.op === "avg") {
                dp["__" + agg.alias + "__sum"] = toNumber(r["__" + agg.alias + "__sum"]);
                dp["__" + agg.alias + "__cnt"] = toNumber(r["__" + agg.alias + "__cnt"]);
            }
        }
        return dp;
    })
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}
const MAX_DENOMINATED = 12;
function resolveDenomColumn(model, path) {
    var _a;
    if (!path.includes(".")) {
        return { sql: resolveColumn(model, path), include: [] };
    }
    const [assocName, ...rest] = path.split(".");
    if (rest.length !== 1) {
        throw (0, error_1.createError)(400, `\`inUSD\` path '${path}' is more than one hop; only 'association.column' is supported`);
    }
    const association = (_a = model.associations) === null || _a === void 0 ? void 0 : _a[assocName];
    if (!association) {
        throw (0, error_1.createError)(400, `\`inUSD\` names association '${assocName}', which '${model.name}' does not have`);
    }
    if (association.associationType !== "BelongsTo") {
        throw (0, error_1.createError)(400, `\`inUSD\` may only reach through a BelongsTo; '${assocName}' is a ${association.associationType} ` +
            `and joining it would multiply the aggregate`);
    }
    const target = association.target;
    const bare = resolveColumn(target, rest[0]);
    const alias = "`" + String(association.as).replace(/`/g, "``") + "`";
    return {
        sql: `${alias}.${bare}`,
        include: [{ association, attributes: [], required: true }],
    };
}
async function fetchDenominated(model, agg, additionalWhere, bucket, dateField, dateWhere) {
    var _a;
    const { sql: currencyCol, include } = resolveDenomColumn(model, String(agg.inUSD));
    const qualifier = include.length ? model.name : undefined;
    const attributes = [];
    if (bucket) {
        attributes.push([
            sequelize_1.Sequelize.literal(bucketExpr(resolveColumn(model, dateField, qualifier), bucket)),
            "dateGroup",
        ]);
    }
    attributes.push([sequelize_1.Sequelize.literal(currencyCol), "denomCurrency"]);
    attributes.push([sequelize_1.Sequelize.literal(buildAggregateSql(model, agg, qualifier)), agg.alias]);
    const group = bucket ? ["dateGroup"] : [];
    group.push(sequelize_1.Sequelize.literal(currencyCol));
    const rows = (await model.findAll({
        where: { ...(dateWhere || {}), ...additionalWhere },
        attributes,
        group,
        include,
        raw: true,
    }));
    const seen = [
        ...new Set(rows.map((r) => { var _a; return String((_a = r.denomCurrency) !== null && _a !== void 0 ? _a : ""); }).filter(Boolean)),
    ];
    const rates = await (0, utils_1.getUsdRates)(seen);
    const byBucket = new Map();
    const unpriced = new Set();
    for (const r of rows) {
        const raw = toNumber(r[agg.alias]);
        if (!raw)
            continue;
        const code = String((_a = r.denomCurrency) !== null && _a !== void 0 ? _a : "");
        const rate = rates.get(code);
        if (rate === undefined) {
            unpriced.add(code || "(none)");
            continue;
        }
        const key = bucket ? (0, date_fns_1.format)(new Date(r.dateGroup), "yyyy-MM-dd HH:mm:ss") : "";
        byBucket.set(key, (byBucket.get(key) || 0) + raw * rate);
    }
    return { byBucket, unpriced: [...unpriced] };
}
async function fetchSnapshot(model, aggregations, additionalWhere, forceTotal = false) {
    if (!aggregations.length && !forceTotal)
        return {};
    const rows = await model.findAll({
        where: additionalWhere,
        attributes: buildAttributes(model, aggregations, null),
        include: [],
        raw: true,
    });
    const row = rows[0] || {};
    const out = { [SNAPSHOT_TOTAL]: toNumber(row.total) };
    for (const agg of aggregations)
        out[agg.alias] = toNumber(row[agg.alias]);
    return out;
}
function toNumber(v) {
    if (v === null || v === undefined)
        return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function foldPeriod(rows, alias, op) {
    if (!rows.length)
        return 0;
    const vals = rows.map((r) => toNumber(r[alias]));
    switch (op) {
        case "min":
            return vals.length ? Math.min(...vals.filter((v, i) => rows[i][alias] !== null)) : 0;
        case "max":
            return vals.length ? Math.max(...vals) : 0;
        case "avg": {
            const num = rows.reduce((s, r) => s + toNumber(r["__" + alias + "__sum"]), 0);
            const den = rows.reduce((s, r) => s + toNumber(r["__" + alias + "__cnt"]), 0);
            return den ? num / den : 0;
        }
        case "countDistinct":
            return vals.length ? Math.max(...vals) : 0;
        default:
            return vals.reduce((a, b) => a + b, 0);
    }
}
function latestFor(rows, alias) {
    for (let i = rows.length - 1; i >= 0; i--) {
        const v = toNumber(rows[i][alias]);
        if (v !== 0)
            return v;
    }
    return rows.length ? toNumber(rows[rows.length - 1][alias]) : 0;
}
async function getChartData({ model, timeframe, charts, kpis, where = {}, dateField = "createdAt", timeframeMode = "rolling", }) {
    const safeCharts = Array.isArray(charts) ? charts : [];
    const safeKpis = Array.isArray(kpis) ? kpis : [];
    if (dateField !== "createdAt" && !isDateAttr(model, dateField)) {
        throw (0, error_1.createError)(400, `dateField '${dateField}' is not a date column on '${model.name}'`);
    }
    const dateCol = resolveColumn(model, dateField);
    const { aggregations, derived, errors } = extractAggregations(model, safeCharts, safeKpis);
    const win = resolveWindow(timeframe, timeframeMode);
    const denominatedAll = aggregations.filter((a) => a.inUSD);
    if (denominatedAll.length > MAX_DENOMINATED) {
        for (const a of denominatedAll.slice(MAX_DENOMINATED)) {
            errors.push({
                id: a.alias,
                message: `This page asks for ${denominatedAll.length} currency-converted totals; ` +
                    `the limit is ${MAX_DENOMINATED}. Each one costs its own grouped query.`,
            });
        }
    }
    const denominated = denominatedAll.slice(0, MAX_DENOMINATED);
    const overflowAliases = new Set(denominatedAll.slice(MAX_DENOMINATED).map((a) => a.alias));
    const plain = aggregations.filter((a) => !a.inUSD);
    const windowAggs = plain.filter((a) => a.scope !== "all");
    const snapshotAggs = plain.filter((a) => a.scope === "all");
    const denominatedWindow = denominated.filter((a) => a.scope !== "all");
    const denominatedSnapshot = denominated.filter((a) => a.scope === "all");
    const needsSnapshotTotal = safeKpis.some((k) => (k === null || k === void 0 ? void 0 : k.valueMode) === "current" && (k === null || k === void 0 ? void 0 : k.metric) === "total" && !(k === null || k === void 0 ? void 0 : k.aggregation) && !(k === null || k === void 0 ? void 0 : k.derived));
    const failedIds = new Set(errors.map((e) => e.id));
    const topNCharts = safeCharts.filter((c) => { var _a; return ((_a = c.config) === null || _a === void 0 ? void 0 : _a.groupBy) && !failedIds.has(c.id); });
    if (topNCharts.length > MAX_GROUPBY_QUERIES) {
        for (const c of topNCharts.slice(MAX_GROUPBY_QUERIES)) {
            errors.push({
                id: c.id,
                message: `This page asks for ${topNCharts.length} ranked breakdowns; the limit is ${MAX_GROUPBY_QUERIES}.`,
            });
        }
    }
    const runnableTopN = topNCharts.slice(0, MAX_GROUPBY_QUERIES);
    const [baseData, snapshot, windowedExact, topN, denomWindow, denomSnapshot] = await Promise.all([
        fetchBuckets(model, win, dateCol, dateField, windowAggs, where),
        fetchSnapshot(model, snapshotAggs, where, needsSnapshotTotal),
        fetchWindowedExact(model, win, dateField, windowAggs, where),
        Promise.all(runnableTopN.map((c) => { var _a; return fetchTopN(model, c, win, dateField, where, ((_a = c.config) === null || _a === void 0 ? void 0 : _a.scope) !== "all")
            .then((slices) => ({ id: c.id, slices }))
            .catch((e) => {
            errors.push({ id: c.id, message: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
            return { id: c.id, slices: [] };
        }); })),
        Promise.all(denominatedWindow.map((a) => fetchDenominated(model, a, where, win.bucket, dateField, {
            [dateField]: { [sequelize_1.Op.between]: [win.start, win.end] },
        })
            .then((r) => ({ alias: a.alias, ...r }))
            .catch((e) => {
            errors.push({ id: a.alias, message: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
            return { alias: a.alias, byBucket: new Map(), unpriced: [] };
        }))),
        Promise.all(denominatedSnapshot.map((a) => fetchDenominated(model, a, where, null, dateField, null)
            .then((r) => ({ alias: a.alias, ...r }))
            .catch((e) => {
            errors.push({ id: a.alias, message: (e === null || e === void 0 ? void 0 : e.message) || String(e) });
            return { alias: a.alias, byBucket: new Map(), unpriced: [] };
        }))),
    ]);
    const topNById = new Map(topN.map((t) => [t.id, t.slices]));
    const unpricedByAlias = new Map();
    for (const d of [...denomWindow, ...denomSnapshot]) {
        if (d.unpriced.length)
            unpricedByAlias.set(d.alias, d.unpriced);
    }
    for (const alias of overflowAliases)
        unpricedByAlias.delete(alias);
    const keyOf = (d) => (0, date_fns_1.format)(d, "yyyy-MM-dd HH:mm:ss");
    const byKey = new Map(baseData.map((dp) => [keyOf(dp.date), dp]));
    const aggregatedData = win.slots.map((slot) => {
        const hit = byKey.get(keyOf(slot));
        if (hit)
            return { ...hit, date: slot };
        const dp = { date: slot, total: 0 };
        for (const agg of windowAggs)
            dp[agg.alias] = 0;
        return dp;
    });
    for (const d of denomWindow) {
        for (const row of aggregatedData) {
            row[d.alias] = d.byBucket.get(keyOf(row.date)) || 0;
        }
    }
    const denominatedSnapshotTotals = {};
    for (const d of denomSnapshot) {
        denominatedSnapshotTotals[d.alias] = d.byBucket.get("") || 0;
    }
    const aliasSet = new Set([
        "total",
        ...windowAggs.map((a) => a.alias),
        ...snapshotAggs.map((a) => a.alias),
        ...denominated.map((a) => a.alias),
    ]);
    const validDerived = derived.filter((d) => {
        const bad = d.of.find((k) => !aliasSet.has(k));
        if (bad) {
            errors.push({
                id: d.alias,
                message: `Derived metric '${d.alias}' references unknown alias '${bad}'`,
            });
            return false;
        }
        return true;
    });
    for (const d of validDerived) {
        for (const row of aggregatedData) {
            row[d.alias] = evalDerived(d, (k) => toNumber(row[k]));
        }
    }
    const result = { kpis: [] };
    if (errors.length)
        result.errors = errors;
    result.meta = {
        timeframe,
        timeframeMode,
        dateField,
        bucket: win.bucket,
        start: win.start.toISOString(),
        end: win.end.toISOString(),
    };
    const opFor = new Map(aggregations.map((a) => [a.alias, a.op]));
    const failed = new Set(errors.map((e) => e.id));
    const periodTotals = { total: 0 };
    periodTotals.total = aggregatedData.reduce((s, r) => s + toNumber(r.total), 0);
    for (const agg of windowAggs) {
        periodTotals[agg.alias] = foldPeriod(aggregatedData, agg.alias, agg.op);
    }
    for (const agg of denominatedWindow) {
        periodTotals[agg.alias] = foldPeriod(aggregatedData, agg.alias, "sum");
    }
    Object.assign(periodTotals, windowedExact);
    Object.assign(periodTotals, snapshot);
    Object.assign(periodTotals, denominatedSnapshotTotals);
    for (const d of validDerived) {
        periodTotals[d.alias] = evalDerived(d, (k) => toNumber(periodTotals[k]));
    }
    safeKpis.forEach((kpi) => {
        var _a;
        var _b;
        if (failed.has(kpi.id) || failed.has(kpi.metric)) {
            result.kpis.push({
                id: kpi.id,
                title: kpi.title,
                value: null,
                change: null,
                trend: [],
                icon: kpi.icon,
                error: (_a = errors.find((e) => e.id === kpi.id || e.id === kpi.metric)) === null || _a === void 0 ? void 0 : _a.message,
            });
            return;
        }
        const mode = kpi.valueMode || "periodTotal";
        const op = opFor.get(kpi.metric);
        let value;
        if (mode === "current") {
            const snap = kpi.metric === "total"
                ? snapshot[SNAPSHOT_TOTAL]
                : (_b = snapshot[kpi.metric]) !== null && _b !== void 0 ? _b : denominatedSnapshotTotals[kpi.metric];
            value = toNumber(snap !== undefined ? snap : periodTotals[kpi.metric]);
        }
        else if (mode === "latestBucket") {
            value = latestFor(aggregatedData, kpi.metric);
        }
        else {
            value = toNumber(periodTotals[kpi.metric]);
        }
        let change = null;
        if (mode === "latestBucket") {
            const idx = aggregatedData.length - 1;
            const prev = idx > 0 ? toNumber(aggregatedData[idx - 1][kpi.metric]) : 0;
            change = prev === 0 ? null : ((value - prev) / prev) * 100;
        }
        else if (mode === "periodTotal" && aggregatedData.length > 1) {
            const half = Math.floor(aggregatedData.length / 2);
            const older = aggregatedData.slice(0, half);
            const newer = aggregatedData.slice(half);
            const a = foldPeriod(older, kpi.metric, op);
            const b = foldPeriod(newer, kpi.metric, op);
            change = a === 0 ? null : ((b - a) / a) * 100;
        }
        if (change !== null && Number.isFinite(change)) {
            change = Math.round(change * 100) / 100;
        }
        else {
            change = null;
        }
        const trend = aggregatedData.map((row) => ({
            date: row.date.toISOString(),
            value: toNumber(row[kpi.metric]),
        }));
        const unpriced = unpricedByAlias.get(kpi.metric);
        result.kpis.push({
            id: kpi.id,
            title: kpi.title,
            value,
            change,
            trend,
            icon: kpi.icon,
            format: kpi.format,
            currency: kpi.currency,
            invert: kpi.invert,
            valueMode: mode,
            ...((unpriced === null || unpriced === void 0 ? void 0 : unpriced.length) ? { unpriced } : {}),
        });
    });
    safeCharts.forEach((chart) => {
        var _a, _b, _c;
        if (failed.has(chart.id)) {
            result[chart.id] = [];
            return;
        }
        if ((_a = chart.config) === null || _a === void 0 ? void 0 : _a.groupBy) {
            result[chart.id] = (topNById.get(chart.id) || []).map((s, i) => ({
                ...s,
                color: s.id === "__other__" ? "gray" : CATEGORICAL[i % CATEGORICAL.length],
            }));
            return;
        }
        if (chart.type === "pie") {
            result[chart.id] =
                ((_c = (_b = chart.config) === null || _b === void 0 ? void 0 : _b.status) === null || _c === void 0 ? void 0 : _c.map((st) => ({
                    id: String(st.value),
                    name: st.label,
                    value: toNumber(periodTotals[`${chart.id}__${String(st.value)}`]),
                    color: st.color,
                }))) || [];
        }
        else {
            result[chart.id] = aggregatedData.map((row) => {
                const item = { date: row.date.toISOString() };
                (chart.metrics || []).forEach((metric) => {
                    item[metric] = toNumber(row[metric]);
                });
                return item;
            });
        }
    });
    return result;
}
