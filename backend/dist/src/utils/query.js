"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRecordParams = exports.commonBulkDeleteResponses = exports.commonBulkDeleteParams = exports.createRecordResponses = exports.storeRecordResponses = exports.updateRecordResponses = exports.deleteRecordResponses = exports.invalidRequestResponse = exports.serverErrorResponse = exports.notFoundMetadataResponse = exports.unauthorizedResponse = void 0;
exports.getFiltered = getFiltered;
exports.parseFilterParam = parseFilterParam;
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
};
async function getFiltered({ model, query, where, customFilterHandler, customStatus, sortField = "createdAt", timestamps = true, paranoid = true, numericFields = [], includeModels = [], excludeFields = [], excludeRecords = [], compute = [], }) {
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 10;
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
    const order = sortFields.map((field, index) => {
        const currentSortOrder = sortOrders[index] && sortOrders[index].toLowerCase() === "asc"
            ? "ASC"
            : "DESC";
        if (field.includes(".")) {
            const parts = field.split(".");
            const orderArr = [];
            let currentModel = model;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (currentModel.associations && currentModel.associations[part]) {
                    const association = currentModel.associations[part];
                    orderArr.push({ model: association.target, as: part });
                    currentModel = association.target;
                }
                else {
                    orderArr.push(part);
                }
            }
            orderArr.push(parts[parts.length - 1]);
            orderArr.push(currentSortOrder);
            return orderArr;
        }
        else {
            return [field, currentSortOrder];
        }
    });
    const rawFilter = parseFilterParam(query.filter, numericFields);
    const { nestedFilters, directFilters } = buildNestedFilters(rawFilter);
    const whereClause = {
        ...where,
        ...(customFilterHandler ? customFilterHandler(directFilters) : {}),
    };
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
        if (numericFields.includes(key) && typeof filterValue !== "object") {
            whereClause[key] = parseFloat(filterValue) || filterValue;
        }
        else if (typeof filterValue === "object" && filterValue.operator) {
            const { value, operator } = filterValue;
            const op = operatorMap[operator];
            whereClause[key] = { [op]: value };
        }
        else {
            whereClause[key] = filterValue;
        }
    });
    let hasParanoid = !query.showDeleted;
    if (timestamps && paranoid) {
        if (query.showDeleted === "true") {
            whereClause[sequelize_1.Op.and] = { deletedAt: { [sequelize_1.Op.ne]: null } };
        }
        else {
            whereClause[sequelize_1.Op.and] = { deletedAt: null };
        }
    }
    else {
        hasParanoid = undefined;
    }
    const adjustedIncludeModels = adjustIncludeModels(includeModels, excludeRecords, nestedFilters);
    const attributes = compute && compute.length > 0
        ? { include: compute, exclude: excludeFields }
        : { exclude: excludeFields };
    const findOptions = {
        where: whereClause,
        offset,
        limit: perPage,
        include: adjustedIncludeModels,
        distinct: true,
        col: "id",
        attributes,
        order: order,
        paranoid: hasParanoid,
    };
    const { count, rows } = await model.findAndCountAll(findOptions);
    return {
        items: rows.map((row) => row.get({ plain: true })),
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
        const specificFilters = filters[includeModel.as] || {};
        const where = {
            ...includeModel.where,
            ...specificFilters,
            ...(exclusions.length
                ? {
                    [sequelize_1.Op.and]: exclusions.map((exclude) => ({
                        [exclude.key]: { [sequelize_1.Op.ne]: exclude.value },
                    })),
                }
                : {}),
        };
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
function buildNestedFilters(filters) {
    const nestedFilters = {};
    const directFilters = {};
    Object.entries(filters).forEach(([fullKey, value]) => {
        if (typeof value === "boolean" ||
            (typeof value === "object" && "operator" in value && "value" in value)) {
            directFilters[fullKey] = value;
        }
        else {
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
        await transaction.rollback();
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
        await transaction.rollback();
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
        else if (query.force) {
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
        else if (query.force) {
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
        console_1.logger.error("QUERY", "Error in bulk delete", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
}
