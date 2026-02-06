"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/admin/system/utils");
const console_1 = require("@b/utils/console");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
exports.metadata = {
    summary: "Lists all products (extensions, blockchains, exchange providers) with license status",
    operationId: "listAllProducts",
    tags: ["Admin", "System", "Products"],
    responses: {
        200: {
            description: "List of all products with license and update information",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            extensions: {
                                type: "array",
                                items: { type: "object" },
                            },
                            blockchains: {
                                type: "array",
                                items: { type: "object" },
                            },
                            exchangeProviders: {
                                type: "array",
                                items: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Products"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "view.extension",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Get All Products",
};
async function checkLicenseFileExists(productId) {
    if (!productId)
        return false;
    const cwd = process.cwd();
    const rootPath = cwd.endsWith("backend") || cwd.endsWith("backend/") || cwd.endsWith("backend\\")
        ? path_1.default.dirname(cwd)
        : cwd;
    const licFilePath = path_1.default.join(rootPath, "lic", `${productId}.lic`);
    try {
        await fs_1.promises.access(licFilePath);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function hasNewerVersion(currentVersion, latestVersion) {
    if (!currentVersion || !latestVersion)
        return false;
    const current = currentVersion.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);
    for (let i = 0; i < Math.max(current.length, latest.length); i++) {
        const curr = current[i] || 0;
        const lat = latest[i] || 0;
        if (lat > curr)
            return true;
        if (curr > lat)
            return false;
    }
    return false;
}
exports.default = async (data) => {
    const { ctx } = data;
    let licenseUpdates = { status: false, products: [] };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching license updates");
        licenseUpdates = await (0, utils_1.fetchAllProductsUpdates)();
    }
    catch (error) {
        console_1.logger.error("PRODUCTS", "Failed to fetch license updates", error);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching all products");
    const [extensionsRaw, blockchainsRaw, exchangeProvidersRaw] = await Promise.all([
        db_1.models.extension.findAll({
            where: { [sequelize_1.Op.not]: { name: "swap" } },
            attributes: { exclude: ["createdAt", "updatedAt"] },
        }),
        db_1.models.ecosystemBlockchain ? db_1.models.ecosystemBlockchain.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
        }) : Promise.resolve([]),
        db_1.models.exchange.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
        }),
    ]);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing extension licenses");
    const extensions = await Promise.all(extensionsRaw.map(async (extension) => {
        var _a;
        const extensionData = extension.toJSON();
        const licenseProduct = (_a = licenseUpdates.products) === null || _a === void 0 ? void 0 : _a.find((p) => p.product_id === extension.productId);
        return {
            ...extensionData,
            category: "extension",
            licenseVerified: await checkLicenseFileExists(extension.productId || ""),
            hasLicenseUpdate: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.has_version)
                ? hasNewerVersion(extension.version || "", licenseProduct.latest_version)
                : false,
            licenseVersion: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.latest_version) || null,
            licenseReleaseDate: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.release_date) || null,
            licenseSummary: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.summary) || null,
        };
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing blockchain licenses");
    const blockchains = await Promise.all(blockchainsRaw.map(async (blockchain) => {
        var _a;
        const blockchainData = blockchain.toJSON();
        const licenseProduct = (_a = licenseUpdates.products) === null || _a === void 0 ? void 0 : _a.find((p) => p.product_id === blockchain.productId);
        return {
            ...blockchainData,
            category: "blockchain",
            title: blockchainData.name || blockchainData.chain,
            licenseVerified: await checkLicenseFileExists(blockchain.productId),
            hasLicenseUpdate: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.has_version)
                ? hasNewerVersion(blockchain.version || "0.0.1", licenseProduct.latest_version)
                : false,
            licenseVersion: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.latest_version) || null,
            licenseReleaseDate: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.release_date) || null,
            licenseSummary: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.summary) || null,
        };
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing exchange provider licenses");
    const exchangeProviders = await Promise.all(exchangeProvidersRaw.map(async (provider) => {
        var _a;
        const providerData = provider.toJSON();
        const licenseProduct = (_a = licenseUpdates.products) === null || _a === void 0 ? void 0 : _a.find((p) => p.product_id === provider.productId);
        const hasLicenseFile = provider.productId
            ? await checkLicenseFileExists(provider.productId)
            : false;
        return {
            ...providerData,
            category: "exchange",
            licenseVerified: hasLicenseFile,
            hasLicenseUpdate: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.has_version)
                ? hasNewerVersion(provider.version || "0.0.1", licenseProduct.latest_version)
                : false,
            licenseVersion: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.latest_version) || null,
            licenseReleaseDate: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.release_date) || null,
            licenseSummary: (licenseProduct === null || licenseProduct === void 0 ? void 0 : licenseProduct.summary) || null,
        };
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("All products retrieved successfully");
    return {
        extensions: extensions.sort((a, b) => (a.title || "").localeCompare(b.title || "")),
        blockchains: blockchains.sort((a, b) => (a.title || a.chain || "").localeCompare(b.title || b.chain || "")),
        exchangeProviders: exchangeProviders.sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    };
};
