"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRecordParams = exports.commonBulkDeleteResponses = exports.commonBulkDeleteParams = exports.createRecordResponses = exports.storeRecordResponses = exports.updateRecordResponses = exports.deleteRecordResponses = exports.invalidRequestResponse = exports.serverErrorResponse = exports.notFoundMetadataResponse = exports.unauthorizedResponse = exports.__testing__ = void 0;
exports.getFiltered = getFiltered;
exports.parseFilterParam = parseFilterParam;
exports.unwrapFilterValue = unwrapFilterValue;
exports.takeDirectFilter = takeDirectFilter;
exports.applyDirectFilters = applyDirectFilters;
exports.updateStatus = updateStatus;
exports.getRecord = getRecord;
exports.getRecords = getRecords;
exports.deleteFile = deleteFile;
exports.updateRecord = updateRecord;
exports.storeRecord = storeRecord;
exports.handleSingleDelete = handleSingleDelete;
exports.handleBulkDelete = handleBulkDelete;
const promises_1 = __importDefault(require("fs/promises"));
const sequelize_1 = require("sequelize");
const error_1 = require("./error");
const db_1 = require("@b/db");
const path_1 = __importDefault(require("path"));
const validation_1 = require("./validation");
const console_1 = require("@b/utils/console");
const transaction_1 = require("@b/utils/transaction");
const referential_guard_rules_1 = require("@b/utils/referential-guard-rules");
const operatorMap = {
    equal: sequelize_1.Op.eq,
    notEqual: sequelize_1.Op.ne,
    greaterThan: sequelize_1.Op.gt,
    greaterThanOrEqual: sequelize_1.Op.gte,
    lessThan: sequelize_1.Op.lt,
    lessThanOrEqual: sequelize_1.Op.lte,
    between: sequelize_1.Op.between,
    notBetween: sequelize_1.Op.notBetween,
    like: sequelize_1.Op.like,
    notLike: sequelize_1.Op.notLike,
    startsWith: sequelize_1.Op.startsWith,
    endsWith: sequelize_1.Op.endsWith,
    substring: sequelize_1.Op.substring,
    regexp: sequelize_1.Op.regexp,
    notRegexp: sequelize_1.Op.notRegexp,
    contains: sequelize_1.Op.like,
    in: sequelize_1.Op.in,
    notIn: sequelize_1.Op.notIn,
};
const MAX_PER_PAGE = 1000;
const quoteIdentifier = (identifier) => `\`${identifier.replace(/`/g, "``")}\``;
function findIncludeByAlias(includes, alias) {
    if (!Array.isArray(includes))
        return undefined;
    return includes.find((inc) => { var _a, _b, _c, _d; return ((inc === null || inc === void 0 ? void 0 : inc.as) ||
        ((_c = (_b = (_a = inc === null || inc === void 0 ? void 0 : inc.model) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.singular) ||
        ((_d = inc === null || inc === void 0 ? void 0 : inc.model) === null || _d === void 0 ? void 0 : _d.name)) === alias; });
}
function includeDuplicates(model, include) {
    var _a;
    const association = (_a = model.associations) === null || _a === void 0 ? void 0 : _a[include === null || include === void 0 ? void 0 : include.as];
    if (!association)
        return false;
    if (association.isMultiAssociation && !include.separate)
        return true;
    return (include.include || []).some((child) => includeDuplicates(association.target, child));
}
function includeMayFanOut(model, include) {
    var _a;
    const association = (_a = model.associations) === null || _a === void 0 ? void 0 : _a[include === null || include === void 0 ? void 0 : include.as];
    if (!association)
        return false;
    if (association.associationType !== "BelongsTo" && !include.separate)
        return true;
    return (include.include || []).some((child) => includeMayFanOut(association.target, child));
}
function collectWhereAliases(node, aliases) {
    if (!node || typeof node !== "object")
        return;
    if (Array.isArray(node)) {
        for (const child of node)
            collectWhereAliases(child, aliases);
        return;
    }
    for (const key of Reflect.ownKeys(node)) {
        if (typeof key === "string" && key.length > 2 && key.startsWith("$") && key.endsWith("$")) {
            const segments = key.slice(1, -1).split(".");
            for (const segment of segments.slice(0, -1))
                aliases.add(segment);
        }
        collectWhereAliases(node[key], aliases);
    }
}
function includeIsRequired(include) {
    if (include === null || include === void 0 ? void 0 : include.required)
        return true;
    return ((include === null || include === void 0 ? void 0 : include.include) || []).some((child) => includeIsRequired(child));
}
function isOrderableAttribute(model, attribute, computeAliases) {
    if (computeAliases === null || computeAliases === void 0 ? void 0 : computeAliases.has(attribute))
        return true;
    const attributes = (model === null || model === void 0 ? void 0 : model.rawAttributes) || {};
    return Object.prototype.hasOwnProperty.call(attributes, attribute);
}
function resolveOrderElement(model, field, direction, includes, computeAliases, hoistedAliases) {
    var _a;
    const parts = field
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
    if (parts.length === 0)
        return null;
    if (parts.length === 1) {
        return isOrderableAttribute(model, parts[0], computeAliases)
            ? { order: [parts[0], direction] }
            : null;
    }
    const orderArr = [];
    let currentModel = model;
    let currentIncludes = includes;
    for (let i = 0; i < parts.length - 1; i++) {
        const alias = parts[i];
        const association = (_a = currentModel.associations) === null || _a === void 0 ? void 0 : _a[alias];
        const included = findIncludeByAlias(currentIncludes, alias);
        if (!association || !included || included.separate)
            return null;
        orderArr.push({ model: association.target, as: alias });
        currentModel = association.target;
        currentIncludes = included.include;
    }
    const attribute = parts[parts.length - 1];
    if (!isOrderableAttribute(currentModel, attribute))
        return null;
    if (hoistedAliases.has(parts[0])) {
        const sortAlias = `__sort_${parts.join("_")}`.replace(/[^\w]/g, "_");
        return {
            order: [(0, sequelize_1.literal)(quoteIdentifier(sortAlias)), direction],
            computed: [
                (0, sequelize_1.literal)(`${quoteIdentifier(parts.slice(0, -1).join("->"))}.${quoteIdentifier(attribute)}`),
                sortAlias,
            ],
        };
    }
    orderArr.push(attribute, direction);
    return { order: orderArr };
}
async function getFiltered({ model, query, where, customFilterHandler, customStatus, sortField = "createdAt", timestamps = true, paranoid = true, numericFields = [], includeModels = [], excludeFields = [], excludeRecords = [], compute = [], }) {
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const perPage = Math.min(Math.max(1, Math.floor(Number(query.perPage) || 10)), MAX_PER_PAGE);
    const offset = (page - 1) * perPage;
    let sortOrderQuery = query.sortOrder || "desc";
    if (typeof sortOrderQuery === "string") {
        sortOrderQuery = decodeURIComponent(sortOrderQuery);
    }
    if (typeof sortField === "string") {
        sortField = decodeURIComponent(sortField);
    }
    let sortFields = [];
    if (typeof sortField === "string") {
        sortFields = sortField
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    else if (Array.isArray(sortField)) {
        sortFields = sortField;
    }
    else {
        sortFields = [sortField];
    }
    let sortOrders = [];
    if (typeof sortOrderQuery === "string") {
        sortOrders = sortOrderQuery
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    else if (Array.isArray(sortOrderQuery)) {
        sortOrders = sortOrderQuery;
    }
    else {
        sortOrders = [sortOrderQuery];
    }
    const rawFilter = parseFilterParam(query.filter, numericFields);
    const { nestedFilters, directFilters } = buildNestedFilters(rawFilter, model);
    const polymorphicClauses = rewritePolymorphicFilters(includeModels, nestedFilters);
    const whereClause = {
        ...where,
        ...(customFilterHandler ? customFilterHandler(directFilters) : {}),
    };
    if (polymorphicClauses.length) {
        const existing = whereClause[sequelize_1.Op.and];
        whereClause[sequelize_1.Op.and] = existing
            ? [...(Array.isArray(existing) ? existing : [existing]), ...polymorphicClauses]
            : polymorphicClauses;
    }
    excludeRecords.forEach((exclude) => {
        if (!exclude.model) {
            whereClause[exclude.key] = { [sequelize_1.Op.ne]: exclude.value };
        }
    });
    customStatus === null || customStatus === void 0 ? void 0 : customStatus.forEach(({ key, true: trueValue, false: falseValue }) => {
        if (Object.prototype.hasOwnProperty.call(directFilters, key)) {
            const statusValue = directFilters[key];
            if (statusValue === "true") {
                whereClause[key] = trueValue;
            }
            else if (statusValue === "false") {
                whereClause[key] = falseValue;
            }
            delete directFilters[key];
        }
    });
    Object.entries(directFilters).forEach(([key, filterValue]) => {
        var _a;
        if (numericFields.includes(key) && typeof filterValue !== "object") {
            whereClause[key] = parseFloat(filterValue) || filterValue;
        }
        else if (typeof filterValue === "object" && filterValue.operator) {
            const { value, operator } = filterValue;
            const op = (_a = operatorMap[operator]) !== null && _a !== void 0 ? _a : sequelize_1.Op.eq;
            whereClause[key] = { [op]: value };
        }
        else {
            whereClause[key] = filterValue;
        }
    });
    if (where && typeof where === "object" && Reflect.ownKeys(where).length) {
        const scoped = whereClause[sequelize_1.Op.and];
        whereClause[sequelize_1.Op.and] = [
            ...(Array.isArray(scoped) ? scoped : scoped ? [scoped] : []),
            where,
        ];
    }
    const deletedAtField = (() => {
        var _a, _b, _c, _d;
        const m = model;
        if (((_a = m === null || m === void 0 ? void 0 : m.options) === null || _a === void 0 ? void 0 : _a.paranoid) !== true)
            return null;
        const name = ((_b = m === null || m === void 0 ? void 0 : m._timestampAttributes) === null || _b === void 0 ? void 0 : _b.deletedAt) ||
            (typeof ((_c = m === null || m === void 0 ? void 0 : m.options) === null || _c === void 0 ? void 0 : _c.deletedAt) === "string" ? m.options.deletedAt : null) ||
            "deletedAt";
        return ((_d = m === null || m === void 0 ? void 0 : m.rawAttributes) === null || _d === void 0 ? void 0 : _d[name]) ? name : null;
    })();
    let hasParanoid = !query.showDeleted;
    if (timestamps && paranoid && deletedAtField) {
        const existingAnd = whereClause[sequelize_1.Op.and];
        const existingAndArr = Array.isArray(existingAnd)
            ? existingAnd
            : existingAnd
                ? [existingAnd]
                : [];
        const paranoidClause = query.showDeleted === "true"
            ? { [deletedAtField]: { [sequelize_1.Op.ne]: null } }
            : { [deletedAtField]: null };
        whereClause[sequelize_1.Op.and] = [...existingAndArr, paranoidClause];
    }
    else {
        hasParanoid = undefined;
    }
    const adjustedIncludeModels = adjustIncludeModels(includeModels, excludeRecords, nestedFilters);
    const computeAliases = new Set((compute || [])
        .map((entry) => (Array.isArray(entry) ? entry[1] : undefined))
        .filter((alias) => typeof alias === "string"));
    const usesSubQuery = adjustedIncludeModels.some((include) => includeDuplicates(model, include));
    const hoistedAliases = new Set(usesSubQuery
        ? adjustedIncludeModels
            .filter((include) => !includeDuplicates(model, include) && includeIsRequired(include))
            .map((include) => include.as)
        : []);
    const order = [];
    const sortAttributes = [];
    sortFields.forEach((field, index) => {
        const currentSortOrder = sortOrders[index] && sortOrders[index].toLowerCase() === "asc"
            ? "ASC"
            : "DESC";
        const resolved = resolveOrderElement(model, field, currentSortOrder, adjustedIncludeModels, computeAliases, hoistedAliases);
        if (resolved) {
            order.push(resolved.order);
            if (resolved.computed)
                sortAttributes.push(resolved.computed);
        }
        else {
            console_1.logger.debug("QUERY", `Ignoring unsortable field "${field}" for model ${model.name}`);
        }
    });
    if (order.length === 0) {
        const fallbackDirection = sortOrders[0] && sortOrders[0].toLowerCase() === "asc" ? "ASC" : "DESC";
        const fallbackField = isOrderableAttribute(model, "createdAt")
            ? "createdAt"
            : model.primaryKeyAttribute;
        if (fallbackField && isOrderableAttribute(model, fallbackField)) {
            order.push([fallbackField, fallbackDirection]);
        }
    }
    const extraAttributes = [...(compute || []), ...sortAttributes];
    const attributes = extraAttributes.length > 0
        ? { include: extraAttributes, exclude: excludeFields }
        : { exclude: excludeFields };
    const findOptions = {
        where: whereClause,
        offset,
        limit: perPage,
        include: adjustedIncludeModels,
        distinct: true,
        col: "id",
        attributes: attributes,
        order: order,
        paranoid: hasParanoid,
    };
    const aliasesInWhere = new Set();
    collectWhereAliases(whereClause, aliasesInWhere);
    const countIncludeModels = adjustedIncludeModels.filter((include) => includeIsRequired(include) || aliasesInWhere.has(include.as));
    const countNeedsDistinct = countIncludeModels.some((include) => includeMayFanOut(model, include));
    const [count, rows] = await Promise.all([
        model.count({
            where: whereClause,
            include: countIncludeModels,
            paranoid: hasParanoid,
            ...(countNeedsDistinct
                ? { distinct: true, col: model.primaryKeyAttribute }
                : {}),
        }),
        model.findAll(findOptions),
    ]);
    return {
        items: rows.map((row) => {
            const item = row.get({ plain: true });
            for (const [, alias] of sortAttributes)
                delete item[alias];
            return item;
        }),
        pagination: {
            totalItems: Array.isArray(count) ? count.length : count,
            currentPage: page,
            perPage,
            totalPages: Math.ceil((Array.isArray(count) ? count.length : count) / perPage),
        },
    };
}
function adjustIncludeModels(includeModels, excludeRecords, filters) {
    return includeModels.map((includeModel) => {
        const exclusions = excludeRecords.filter((exclude) => exclude.model === includeModel.model);
        const aliasFilters = filters[includeModel.as];
        const specificFilters = aliasFilters && typeof aliasFilters === "object" && !Array.isArray(aliasFilters)
            ? aliasFilters
            : {};
        const includeScope = includeModel.where;
        const merged = {
            ...includeScope,
            ...specificFilters,
        };
        const priorAnd = merged[sequelize_1.Op.and];
        const andClauses = [
            ...(Array.isArray(priorAnd) ? priorAnd : priorAnd ? [priorAnd] : []),
            ...exclusions.map((exclude) => ({
                [exclude.key]: { [sequelize_1.Op.ne]: exclude.value },
            })),
        ];
        if (includeScope &&
            typeof includeScope === "object" &&
            Reflect.ownKeys(includeScope).length) {
            andClauses.push(includeScope);
        }
        const where = andClauses.length
            ? { ...merged, [sequelize_1.Op.and]: andClauses }
            : merged;
        const required = specificFilters && Object.keys(specificFilters).length > 0
            ? true
            : includeModel.required || false;
        const nestedIncludes = includeModel.includeModels
            ? adjustIncludeModels(includeModel.includeModels, excludeRecords, filters)
            : includeModel.include || [];
        return {
            ...includeModel,
            where,
            include: nestedIncludes,
            required,
        };
    });
}
function parseFilterParam(filterParam, numericFields) {
    const parsedFilters = {};
    if (!filterParam)
        return parsedFilters;
    let filtersObject = {};
    if (typeof filterParam === "string") {
        try {
            filtersObject = JSON.parse(filterParam);
        }
        catch (error) {
            console_1.logger.debug("QUERY", "Error parsing filter param");
            return parsedFilters;
        }
    }
    Object.entries(filtersObject).forEach(([key, value]) => {
        const keyParts = key.split(".");
        let current = parsedFilters;
        keyParts.slice(0, -1).forEach((part) => {
            current[part] = current[part] || {};
            current = current[part];
        });
        const isNumericField = numericFields.includes(keyParts[keyParts.length - 1]);
        let finalValue = value;
        if (isNumericField &&
            typeof value === "object" &&
            value.operator === "startsWith") {
            finalValue = {
                operator: "greaterThan",
                value: parseFloat(value.value),
            };
        }
        current[keyParts[keyParts.length - 1]] = finalValue;
    });
    return parsedFilters;
}
function unwrapFilterValue(raw) {
    return raw !== null && typeof raw === "object" && "value" in raw
        ? raw.value
        : raw;
}
function takeDirectFilter(filters, key) {
    if (!filters || !Object.prototype.hasOwnProperty.call(filters, key)) {
        return undefined;
    }
    const raw = filters[key];
    delete filters[key];
    return unwrapFilterValue(raw);
}
function applyDirectFilters(where, filters, allowed) {
    var _a, _b;
    for (const [key, kind] of Object.entries(allowed)) {
        if (!filters || !Object.prototype.hasOwnProperty.call(filters, key)) {
            continue;
        }
        const raw = filters[key];
        const operator = raw !== null && typeof raw === "object" && "operator" in raw
            ? raw.operator
            : undefined;
        const value = takeDirectFilter(filters, key);
        if (value === undefined || value === null || value === "")
            continue;
        if (kind === "boolean") {
            where[key] = value === true || value === "true";
            continue;
        }
        if (kind === "date") {
            if (value && typeof value === "object" && "from" in value && "to" in value) {
                where[key] = { [sequelize_1.Op.between]: [new Date(value.from), new Date(value.to)] };
            }
            else {
                const at = new Date(value);
                if (!Number.isNaN(at.getTime())) {
                    where[key] = { [(_a = operatorMap[operator]) !== null && _a !== void 0 ? _a : sequelize_1.Op.eq]: at };
                }
            }
            continue;
        }
        if (kind === "number") {
            if (Array.isArray(value)) {
                const range = value.map(Number);
                if (range.length === 2 && !range.some(Number.isNaN)) {
                    where[key] = { [(_b = operatorMap[operator]) !== null && _b !== void 0 ? _b : sequelize_1.Op.between]: range };
                }
                continue;
            }
            const num = Number(value);
            if (Number.isNaN(num))
                continue;
            const op = operator && operator !== "contains" ? operatorMap[operator] : sequelize_1.Op.eq;
            where[key] = { [op !== null && op !== void 0 ? op : sequelize_1.Op.eq]: num };
            continue;
        }
        const op = operator ? operatorMap[operator] : undefined;
        where[key] = op ? { [op]: value } : value;
    }
}
function isFilterableColumn(model, key) {
    const attributes = model === null || model === void 0 ? void 0 : model.rawAttributes;
    return Boolean(attributes && Object.prototype.hasOwnProperty.call(attributes, key));
}
function buildNestedFilters(filters, model) {
    const nestedFilters = {};
    const directFilters = {};
    Object.entries(filters).forEach(([fullKey, value]) => {
        var _a;
        const isEnvelope = typeof value === "object" &&
            value !== null &&
            "operator" in value &&
            "value" in value;
        const isScalarish = value === null || typeof value !== "object" || Array.isArray(value);
        if (typeof value === "boolean" || isEnvelope) {
            directFilters[fullKey] = value;
        }
        else if (isScalarish &&
            !fullKey.includes(".") &&
            isFilterableColumn(model, fullKey)) {
            directFilters[fullKey] = value;
        }
        else {
            if (isScalarish && !fullKey.includes(".")) {
                console_1.logger.debug("QUERY", `Dropping filter "${fullKey}": not a column of ${(_a = model === null || model === void 0 ? void 0 : model.name) !== null && _a !== void 0 ? _a : "model"} and not an association`);
            }
            const keys = fullKey.split(".");
            let current = nestedFilters;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                current[key] = current[key] || {};
                current = current[key];
            }
            const lastKey = keys[keys.length - 1];
            current[lastKey] = value;
        }
    });
    return { nestedFilters: applyOperatorMapping(nestedFilters), directFilters };
}
function rewritePolymorphicFilters(includeModels, nestedFilters) {
    if (!Array.isArray(includeModels) || includeModels.length === 0)
        return [];
    const groups = new Map();
    for (const include of includeModels) {
        const group = include === null || include === void 0 ? void 0 : include.polymorphicGroup;
        if (!group || !(include === null || include === void 0 ? void 0 : include.as))
            continue;
        if (!groups.has(group))
            groups.set(group, []);
        groups.get(group).push(include.as);
    }
    if (groups.size === 0)
        return [];
    const clauses = [];
    for (const aliases of groups.values()) {
        if (aliases.length < 2)
            continue;
        for (const alias of aliases) {
            const filters = nestedFilters === null || nestedFilters === void 0 ? void 0 : nestedFilters[alias];
            if (!filters || typeof filters !== "object")
                continue;
            const columns = Object.keys(filters);
            if (columns.length === 0)
                continue;
            const deep = columns.some((column) => {
                const value = filters[column];
                return (value !== null &&
                    typeof value === "object" &&
                    !Array.isArray(value) &&
                    Object.getOwnPropertySymbols(value).length === 0);
            });
            if (deep)
                continue;
            for (const column of columns) {
                clauses.push({
                    [sequelize_1.Op.or]: aliases.map((member) => ({
                        [`$${member}.${column}$`]: filters[column],
                    })),
                });
            }
            delete nestedFilters[alias];
        }
    }
    return clauses;
}
exports.__testing__ = { rewritePolymorphicFilters };
function applyOperatorMapping(filters) {
    const whereClause = {};
    const processFilters = (currentFilters, parentObject) => {
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value &&
                typeof value === "object" &&
                value.operator &&
                operatorMap[value.operator]) {
                parentObject[key] = { [operatorMap[value.operator]]: value.value };
            }
            else if (value && typeof value === "object" && !value.operator) {
                parentObject[key] = {};
                processFilters(value, parentObject[key]);
            }
            else {
                parentObject[key] = value;
            }
        });
    };
    processFilters(filters, whereClause);
    return whereClause;
}
async function updateStatus(model, id, fieldValue, field = "status", modelTitle = "Record", postUpdate, where) {
    if (!db_1.models[model]) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid model",
        });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing ID",
        });
    }
    if (fieldValue === undefined) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing field value",
        });
    }
    if (!field) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing field name",
        });
    }
    const attributes = db_1.models[model].rawAttributes || {};
    if (!Object.prototype.hasOwnProperty.call(attributes, field)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Model ${model} has no field '${field}'`,
        });
    }
    try {
        const updateFields = {};
        updateFields[field] = fieldValue;
        await db_1.models[model].update(updateFields, {
            where: {
                id,
                ...where,
            },
        });
        const capitalModel = model.charAt(0).toUpperCase() + model.slice(1);
        const message = `${modelTitle ? modelTitle : capitalModel + " " + field} updated successfully`;
        if (postUpdate) {
            if (!Array.isArray(id))
                await postUpdate(id);
        }
        return { message };
    }
    catch (error) {
        console_1.logger.error("QUERY", "Error updating status", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
}
exports.unauthorizedResponse = {
    description: "Unauthorized, admin permission required",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "Error message",
                    },
                },
            },
        },
    },
};
const notFoundMetadataResponse = (model) => ({
    description: `${model} not found`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "Error message",
                    },
                },
            },
        },
    },
});
exports.notFoundMetadataResponse = notFoundMetadataResponse;
exports.serverErrorResponse = {
    description: "Internal server error",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "Error message",
                    },
                },
            },
        },
    },
};
exports.invalidRequestResponse = {
    description: "Invalid request",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "Error message",
                    },
                },
            },
        },
    },
};
const deleteRecordResponses = (model) => {
    return {
        200: {
            description: `${model} deleted successfully`,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message indicating successful deletion",
                            },
                        },
                    },
                },
            },
        },
        401: exports.unauthorizedResponse,
        404: (0, exports.notFoundMetadataResponse)(model),
        500: exports.serverErrorResponse,
    };
};
exports.deleteRecordResponses = deleteRecordResponses;
const updateRecordResponses = (model) => {
    return {
        200: {
            description: `${model} updated successfully`,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message",
                            },
                        },
                    },
                },
            },
        },
        400: exports.invalidRequestResponse,
        401: exports.unauthorizedResponse,
        404: (0, exports.notFoundMetadataResponse)(model),
        500: exports.serverErrorResponse,
    };
};
exports.updateRecordResponses = updateRecordResponses;
const storeRecordResponses = (success, model) => {
    return {
        200: success,
        400: exports.invalidRequestResponse,
        401: exports.unauthorizedResponse,
        404: (0, exports.notFoundMetadataResponse)(model),
        500: exports.serverErrorResponse,
    };
};
exports.storeRecordResponses = storeRecordResponses;
const createRecordResponses = (model) => {
    return {
        200: {
            description: `${model} created successfully`,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message",
                            },
                        },
                    },
                },
            },
        },
        400: exports.invalidRequestResponse,
        401: exports.unauthorizedResponse,
        500: exports.serverErrorResponse,
    };
};
exports.createRecordResponses = createRecordResponses;
function resolveIncludes(includes) {
    if (!includes) {
        return undefined;
    }
    return includes.map((include) => {
        const { model, as, attributes, includeModels, through, required, paranoid } = include;
        const resolvedInclude = {
            model,
            as,
            attributes: attributes === null || attributes === void 0 ? void 0 : attributes.map((attr) => Array.isArray(attr) ? attr : [attr, attr]),
            required,
        };
        if (paranoid !== undefined) {
            resolvedInclude.paranoid = paranoid;
        }
        if (includeModels) {
            resolvedInclude.include = resolveIncludes(includeModels);
        }
        if (through) {
            resolvedInclude.through = through;
        }
        return resolvedInclude;
    });
}
async function getRecord(modelName, id, include, exclude = []) {
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing ID" });
    }
    const model = db_1.models[modelName];
    if (!model) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Model ${modelName} not found` });
    }
    const resolvedIncludes = resolveIncludes(include);
    const data = await model.findOne({
        where: { id },
        attributes: { exclude },
        include: resolvedIncludes,
    });
    if (!data) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: `Record with ID ${id} not found`,
        });
    }
    return data.get({ plain: true });
}
async function getRecords(modelName, ids, include, exclude = []) {
    const model = db_1.models[modelName];
    if (!model) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Model ${modelName} not found` });
    }
    const resolvedIncludes = resolveIncludes(include);
    try {
        const data = await model.findAll({
            where: { id: ids },
            attributes: { exclude },
            include: resolvedIncludes,
        });
        return data.map((item) => item.get({ plain: true }));
    }
    catch (error) {
        console_1.logger.error("QUERY", `Error fetching ${modelName}`, error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Server error" });
    }
}
async function deleteFile(filePath) {
    const sanitizedFilePath = (0, validation_1.sanitizePath)(filePath);
    const fullPath = path_1.default.join(process.cwd(), "public", sanitizedFilePath);
    await promises_1.default.unlink(fullPath);
}
async function updateRecord(modelName, id, updateData, returnResponse = false, relations = [], where) {
    const model = db_1.models[modelName];
    if (!model) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Model ${modelName} not found` });
    }
    const transaction = await db_1.sequelize.transaction();
    try {
        const existingRecord = await model.findByPk(id, { transaction });
        if (!existingRecord) {
            throw (0, error_1.createError)({ statusCode: 404, message: `${modelName} with ID ${id} not found` });
        }
        await model.update(updateData, { where: { id, ...where }, transaction });
        for (const relation of relations) {
            const relatedModel = db_1.models[relation.model];
            if (!relatedModel) {
                console_1.logger.warn("QUERY", `Related model ${relation.model} not found`);
                continue;
            }
            const existingRelations = await relatedModel.findAll({
                where: { [relation.fields.source]: id },
                transaction,
            });
            const newRelationsMap = new Map(relation.data.map((item) => [item, item]));
            const toDelete = existingRelations.filter((item) => !newRelationsMap.has(item[relation.fields.target]));
            await Promise.all(toDelete.map((item) => item.destroy({ transaction })));
            for (const newItem of relation.data) {
                const existingItem = existingRelations.find((item) => item[relation.fields.target] === newItem);
                if (existingItem) {
                    await existingItem.update(newItem, { transaction });
                }
                else {
                    await relatedModel.create({
                        [relation.fields.source]: id,
                        [relation.fields.target]: newItem,
                    }, { transaction });
                }
            }
        }
        await transaction.commit();
        if (returnResponse) {
            return model.findByPk(id);
        }
        else {
            return { message: `${modelName} updated successfully` };
        }
    }
    catch (error) {
        console_1.logger.error("QUERY", "Transaction rollback - update failed", error);
        await (0, transaction_1.rollbackIfActive)(transaction);
        throw error;
    }
}
async function storeRecord({ model, data, relations, returnResponse = false, }) {
    const Model = db_1.models[model];
    if (!Model) {
        throw (0, error_1.createError)({ statusCode: 404, message: `Model ${model} not found` });
    }
    const transaction = await db_1.sequelize.transaction();
    try {
        if (data.customFields === undefined || data.customFields === null) {
            data.customFields = [];
        }
        if (!Array.isArray(data.customFields)) {
            throw (0, error_1.createError)({ statusCode: 400, message: "customFields must be an array" });
        }
        const newRecord = await Model.create(data, { transaction });
        if (relations && Array.isArray(relations)) {
            for (const relation of relations) {
                const relatedModel = db_1.models[relation.model];
                if (!relatedModel) {
                    console_1.logger.warn("QUERY", `Related model ${relation.model} not found`);
                    continue;
                }
                if (Array.isArray(relation.data)) {
                    for (const newItem of relation.data) {
                        await relatedModel.create({
                            [relation.fields.source]: newRecord.id,
                            [relation.fields.target]: newItem,
                        }, { transaction });
                    }
                }
                else {
                    console_1.logger.warn("QUERY", `Relation data for ${relation.model} is not an array`);
                }
            }
        }
        await transaction.commit();
        if (returnResponse) {
            return {
                record: newRecord.get({ plain: true }),
                message: `${model} created successfully`,
            };
        }
        else {
            return { message: `${model} created successfully` };
        }
    }
    catch (error) {
        console_1.logger.error("QUERY", "Transaction rollback - store failed", error);
        await (0, transaction_1.rollbackIfActive)(transaction);
        throw error;
    }
}
const commonBulkDeleteParams = (model) => {
    return [
        {
            name: "restore",
            in: "query",
            description: `Restore the ${model} instead of deleting`,
            required: false,
            schema: {
                type: "boolean",
            },
        },
        {
            name: "force",
            in: "query",
            description: `Delete the ${model} permanently`,
            required: false,
            schema: {
                type: "boolean",
            },
        },
    ];
};
exports.commonBulkDeleteParams = commonBulkDeleteParams;
const commonBulkDeleteResponses = (model) => {
    return {
        200: {
            description: `${model} deleted successfully`,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message",
                            },
                        },
                    },
                },
            },
        },
        400: exports.invalidRequestResponse,
        401: exports.unauthorizedResponse,
        404: (0, exports.notFoundMetadataResponse)(model),
        500: exports.serverErrorResponse,
    };
};
exports.commonBulkDeleteResponses = commonBulkDeleteResponses;
const deleteRecordParams = (model) => {
    return [
        {
            index: 0,
            name: "id",
            in: "path",
            description: `ID of the ${model} to delete`,
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            name: "restore",
            in: "query",
            description: `Restore the ${model} instead of deleting`,
            required: false,
            schema: {
                type: "boolean",
            },
        },
        {
            name: "force",
            in: "query",
            description: `Delete the ${model} permanently`,
            required: false,
            schema: {
                type: "boolean",
            },
        },
    ];
};
exports.deleteRecordParams = deleteRecordParams;
async function handleSingleDelete({ model, query, where = {}, id, preDelete = async () => Promise.resolve(), postDelete = async () => Promise.resolve(), restoreRelated = async () => Promise.resolve(), }) {
    if (!db_1.models[model]) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid model",
        });
    }
    if (!id) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing ID",
        });
    }
    try {
        const whereClause = { ...where, id };
        const capitalModel = model.charAt(0).toUpperCase() + model.slice(1);
        await preDelete();
        if (query.restore) {
            await db_1.models[model].restore({ where: whereClause });
            await restoreRelated();
            await postDelete();
            return { message: `${capitalModel} restored successfully.` };
        }
        else if ((0, referential_guard_rules_1.isForce)(query)) {
            await db_1.models[model].destroy({
                where: whereClause,
                force: true,
            });
            await postDelete();
            return { message: `${capitalModel} deleted permanently.` };
        }
        else {
            await db_1.models[model].destroy({ where: whereClause });
            await postDelete();
            return { message: `${capitalModel} deleted successfully.` };
        }
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.statusCode) && error.statusCode < 500) {
            throw error;
        }
        console_1.logger.error("QUERY", "Error in single delete", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
}
async function handleBulkDelete({ model, ids, query, where = {}, preDelete = async () => Promise.resolve(), postDelete = async () => Promise.resolve(), restoreRelated = async () => Promise.resolve(), }) {
    if (!db_1.models[model]) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid model: ${model}`,
        });
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing IDs",
        });
    }
    try {
        const whereClause = { ...where, id: ids };
        const capitalModel = model.charAt(0).toUpperCase() + model.slice(1);
        await preDelete();
        if (query.restore) {
            await db_1.models[model].restore({ where: whereClause });
            await restoreRelated();
            await postDelete();
            return { message: `${capitalModel} records restored successfully.` };
        }
        else if ((0, referential_guard_rules_1.isForce)(query)) {
            await db_1.models[model].destroy({
                where: whereClause,
                force: true,
            });
            await postDelete();
            return { message: `${capitalModel} records deleted permanently.` };
        }
        else {
            await db_1.models[model].destroy({ where: whereClause });
            await postDelete();
            return { message: `${capitalModel} records deleted successfully.` };
        }
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.statusCode) && error.statusCode < 500) {
            throw error;
        }
        console_1.logger.error("QUERY", "Error in bulk delete", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
}
