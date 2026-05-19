"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const constants_1 = require("@b/utils/constants");
const utils_1 = require("@b/api/admin/content/media/utils");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Fetches user's own media files",
    operationId: "fetchUserMediaFiles",
    tags: ["User", "Media"],
    parameters: [
        ...constants_1.crudParameters,
        {
            name: "uploadDir",
            in: "query",
            description: "The upload directory to filter by",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Media entries for the user",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            items: {
                                type: "array",
                                items: { type: "object", additionalProperties: true },
                            },
                            pagination: {
                                type: "object",
                                properties: {
                                    totalItems: { type: "number" },
                                    currentPage: { type: "number" },
                                    perPage: { type: "number" },
                                    totalPages: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "User not authenticated",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Initializing media cache");
    if (!utils_1.cacheInitialized)
        await (0, utils_1.initMediaWatcher)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing query parameters");
    const page = query.page ? parseInt(query.page) : 1;
    const perPage = query.perPage ? parseInt(query.perPage) : 50;
    const sortField = query.sortField || "dateModified";
    const sortOrder = query.sortOrder || "desc";
    const uploadDir = query.uploadDir || "";
    const numericFields = ["width", "height"];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building filter criteria");
    const rawFilter = parseFilterParam(query.filter, numericFields);
    const { directFilters } = buildNestedFilters(rawFilter);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Filtering user media files");
    const filteredMedia = utils_1.mediaCache.filter((file) => {
        if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file.path))
            return false;
        if (uploadDir) {
            const normalizedDir = uploadDir.replace(/-/g, "/");
            const expectedPath = `/uploads/${normalizedDir}/`;
            if (!file.path.startsWith(expectedPath))
                return false;
        }
        return Object.entries(directFilters).every(([key, filterValue]) => {
            if (filterValue &&
                typeof filterValue === "object" &&
                "operator" in filterValue) {
                const { value, operator } = filterValue;
                const opFunc = utils_1.operatorMap[operator];
                if (typeof opFunc !== "function")
                    return true;
                if (numericFields.includes(key)) {
                    const recordVal = Number(file[key]);
                    const filterVal = parseFloat(value);
                    return opFunc({ [key]: recordVal }, key, filterVal);
                }
                else {
                    return opFunc(file, key, value);
                }
            }
            else {
                if (numericFields.includes(key)) {
                    return Number(file[key]) === Number(filterValue);
                }
                else {
                    return file[key] == filterValue;
                }
            }
        });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sorting results");
    filteredMedia.sort((a, b) => {
        const aVal = numericFields.includes(sortField)
            ? Number(a[sortField])
            : a[sortField];
        const bVal = numericFields.includes(sortField)
            ? Number(b[sortField])
            : b[sortField];
        if (aVal < bVal)
            return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal)
            return sortOrder === "asc" ? 1 : -1;
        return 0;
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Paginating results");
    const totalItems = filteredMedia.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const offset = (page - 1) * perPage;
    const paginatedItems = filteredMedia.slice(offset, offset + perPage);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${paginatedItems.length} media file(s) (page ${page} of ${totalPages})`);
    return {
        items: paginatedItems,
        pagination: {
            totalItems,
            currentPage: page,
            perPage,
            totalPages,
        },
    };
};
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
            console_1.logger.error("USER_MEDIA", "Error parsing filter param", error);
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
        current[keyParts[keyParts.length - 1]] = value;
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
                const k = keys[i];
                current[k] = current[k] || {};
                current = current[k];
            }
            current[keys[keys.length - 1]] = value;
        }
    });
    return { nestedFilters, directFilters };
}
