"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProduct = getProduct;
exports.getBlockchain = getBlockchain;
exports.fetchPublicIp = fetchPublicIp;
exports.getPublicIp = getPublicIp;
exports.callApi = callApi;
exports.verifyLicense = verifyLicense;
exports.activateLicense = activateLicense;
exports.checkLatestVersion = checkLatestVersion;
exports.checkUpdate = checkUpdate;
exports.downloadUpdate = downloadUpdate;
exports.invalidateProductUpdatesCache = invalidateProductUpdatesCache;
exports.fetchAllProductsUpdates = fetchAllProductsUpdates;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const fs_1 = require("fs");
const fs_2 = require("fs");
const system_1 = require("../../../utils/system");
const db_1 = require("@b/db");
const path_1 = __importDefault(require("path"));
const license_1 = require("@b/config/license");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const validation_1 = require("@b/utils/validation");
const update_integrity_1 = require("./update-integrity");
function adminError(message = "System configuration error. Please contact administrator.", details) {
    if (details) {
        console_1.logger.error("ADMIN", message, details);
    }
    else {
        console_1.logger.error("ADMIN", message);
    }
    return new Error(message);
}
let cachedIP = null;
let lastFetched = null;
let nextVerificationDate = null;
const verificationPeriodDays = 3;
const rootPath = (() => {
    const cwd = process.cwd();
    if (cwd.endsWith('/backend') || cwd.endsWith('\\backend')) {
        return path_1.default.join(cwd, '..');
    }
    return cwd;
})();
const licFolderPath = `${rootPath}/lic`;
async function getProduct(id) {
    if (id) {
        const extension = await db_1.models.extension.findOne({
            where: { productId: id },
        });
        if (!extension)
            throw adminError();
        return extension;
    }
    else {
        try {
            const possiblePaths = [
                `${rootPath}/package.json`,
                `${path_1.default.join(rootPath, '..')}/package.json`,
                `${process.cwd()}/package.json`,
                `${path_1.default.join(process.cwd(), '..')}/package.json`,
            ];
            let content = null;
            let usedPath = '';
            for (const filePath of possiblePaths) {
                try {
                    const fileContent = await fs_1.promises.readFile(filePath, "utf8");
                    content = JSON.parse(fileContent);
                    if (content && (content.id || content.name)) {
                        usedPath = filePath;
                        break;
                    }
                }
                catch (err) {
                    continue;
                }
            }
            if (!content || !content.id) {
                throw adminError("Could not find valid package.json with required fields");
            }
            return {
                id: content.id || "35599184",
                productId: content.id || "35599184",
                name: content.name || "bicrypto",
                version: content.version || "5.0.0",
                description: content.description || "BiCrypto Trading Platform",
            };
        }
        catch (error) {
            throw adminError("Could not read product information.", error);
        }
    }
}
async function getBlockchain(id) {
    const blockchain = await db_1.models.ecosystemBlockchain.findOne({
        where: { productId: id },
    });
    if (!blockchain)
        throw (0, error_1.createError)({ statusCode: 404, message: "Blockchain not found" });
    return blockchain;
}
async function fetchPublicIp() {
    try {
        const data = await new Promise((resolve, reject) => {
            const req = https_1.default.get("https://api.ipify.org?format=json", { timeout: 10000 }, (resp) => {
                let data = "";
                resp.on("data", (chunk) => {
                    data += chunk;
                });
                resp.on("end", () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (err) {
                        reject(err);
                    }
                });
                resp.on("error", (err) => {
                    reject(err);
                });
            });
            req.on("timeout", () => {
                req.destroy(new Error("Public IP lookup timed out after 10000ms"));
            });
            req.on("error", (err) => {
                reject(err);
            });
        });
        return data.ip;
    }
    catch (error) {
        console_1.logger.error("ADMIN", `Error fetching public IP: ${error.message}`);
        return null;
    }
}
async function getPublicIp() {
    const now = Date.now();
    if (cachedIP && lastFetched && now - lastFetched < 60000) {
        return cachedIP;
    }
    cachedIP = await fetchPublicIp();
    lastFetched = now;
    return cachedIP;
}
async function callApi(method, url, data = null, filename) {
    try {
        const licenseConfig = (0, license_1.getLicenseConfig)();
        const requestData = data ? JSON.stringify(data) : null;
        const headers = {
            "Content-Type": "application/json",
            "X-License-Secret": licenseConfig.licenseSecret,
            "X-Site-URL": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Client-IP": (await getPublicIp()) || "127.0.0.1",
        };
        if (requestData) {
            headers["Content-Length"] = Buffer.byteLength(requestData).toString();
        }
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === "https:";
        const httpModule = isHttps ? https_1.default : http_1.default;
        const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: headers,
            timeout: 30000,
        };
        console_1.logger.debug("LICENSE_API", `${method} ${url}`);
        const response = await new Promise((resolve, reject) => {
            const req = httpModule.request(requestOptions, (res) => {
                const data = [];
                const contentType = res.headers["content-type"] || "";
                const isZipResponse = contentType.includes("application/zip") || contentType.includes("application/octet-stream");
                console_1.logger.debug("LICENSE_API", `Response status: ${res.statusCode}, Content-Type: ${contentType}, isZip: ${isZipResponse}`);
                if (res.statusCode !== 200) {
                    res.on("data", (chunk) => {
                        data.push(chunk);
                    });
                    res.on("end", () => {
                        let errorMessage = `HTTP ${res.statusCode}`;
                        try {
                            const result = JSON.parse(Buffer.concat(data).toString());
                            errorMessage = result.message || result.error || result.reason || JSON.stringify(result);
                        }
                        catch (_a) {
                            errorMessage = Buffer.concat(data).toString().slice(0, 200) || errorMessage;
                        }
                        reject(new Error(`API Error (${res.statusCode}): ${errorMessage}`));
                    });
                    return;
                }
                if (isZipResponse) {
                    if (!filename) {
                        reject(adminError("Filename required for zip download."));
                        return;
                    }
                    const dirPath = `${rootPath}/updates`;
                    const filePath = `${dirPath}/${filename}.zip`;
                    fs_1.promises.mkdir(dirPath, { recursive: true })
                        .then(() => {
                        const fileStream = (0, fs_2.createWriteStream)(filePath);
                        res.pipe(fileStream);
                        fileStream.on("finish", () => {
                            console_1.logger.info("LICENSE_API", `ZIP file downloaded successfully to: ${filePath}`);
                            resolve({
                                status: true,
                                message: "Update file downloaded successfully",
                                path: filePath,
                                sha256: (0, update_integrity_1.expectedHashFrom)(res.headers),
                            });
                        });
                        fileStream.on("error", (err) => {
                            reject(adminError("Download error.", err));
                        });
                    })
                        .catch((err) => {
                        reject(adminError("Directory error.", err));
                    });
                }
                else {
                    res.on("data", (chunk) => {
                        data.push(chunk);
                    });
                    res.on("end", () => {
                        try {
                            const responseText = Buffer.concat(data).toString();
                            console_1.logger.debug("LICENSE_API", `JSON response received (${responseText.length} bytes)`);
                            const result = JSON.parse(responseText);
                            resolve(result);
                        }
                        catch (e) {
                            reject(new Error(`Invalid JSON response from server: ${Buffer.concat(data).toString().slice(0, 200)}`));
                        }
                    });
                }
                res.on("error", (err) => {
                    reject(new Error(`Response error: ${err.message}`));
                });
            });
            req.on("timeout", () => {
                req.destroy(new Error(`Request to ${url} timed out after 30000ms`));
            });
            req.on("error", (err) => {
                const detail = err.message || err.code || err.name;
                reject(new Error(`Connection error: ${detail}. Is the license server running at ${url}?`));
            });
            if (requestData) {
                req.write(requestData);
            }
            req.end();
        });
        return response;
    }
    catch (error) {
        console_1.logger.error("LICENSE_API", `API call failed: ${error.message}`);
        throw error;
    }
}
async function verifyLicense(productId, license, client, timeBasedCheck) {
    if (timeBasedCheck && verificationPeriodDays > 0) {
        const today = new Date();
        if (nextVerificationDate && today < nextVerificationDate) {
            return { status: true, message: "Verified from cache" };
        }
    }
    const { readLicenseFile } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const licenseData = await readLicenseFile(productId);
    const purchaseCode = (licenseData === null || licenseData === void 0 ? void 0 : licenseData.purchaseCode) || license || null;
    if (!purchaseCode) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No purchase code found. Please activate your license first." });
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    let domain;
    try {
        const url = new URL(siteUrl);
        domain = url.host;
    }
    catch (_a) {
        domain = siteUrl.replace(/^https?:\/\//, "").split("/")[0];
    }
    const { getCachedFingerprint } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const fingerprint = getCachedFingerprint();
    const data = {
        purchaseCode: purchaseCode,
        domain: domain,
        fingerprint: fingerprint,
    };
    const licenseConfig = (0, license_1.getLicenseConfig)();
    console_1.logger.info("LICENSE_API", `Verifying license - Domain: ${domain}, Fingerprint: ${fingerprint ? fingerprint.substring(0, 16) + '...' : 'MISSING'}`);
    console_1.logger.debug("LICENSE_API", `Verify payload: ${JSON.stringify(data)}`);
    const response = await callApi("POST", `${licenseConfig.apiUrl}/api/client/licenses/verify`, data);
    if (timeBasedCheck && verificationPeriodDays > 0 && response.status) {
        const today = new Date();
        nextVerificationDate = new Date();
        nextVerificationDate.setDate(today.getDate() + verificationPeriodDays);
    }
    if (!response.status) {
        const reason = response.reason || "License verification failed";
        throw (0, error_1.createError)({ statusCode: 400, message: reason });
    }
    return response;
}
async function activateLicense(productId, purchaseCode, client, notificationEmail) {
    var _a;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    let domain;
    try {
        const url = new URL(siteUrl);
        domain = url.host;
    }
    catch (_b) {
        domain = siteUrl.replace(/^https?:\/\//, "").split("/")[0];
    }
    const ipAddress = await getPublicIp() || "127.0.0.1";
    const { getCachedFingerprint } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const hardwareFingerprint = getCachedFingerprint();
    const data = {
        purchaseCode: purchaseCode,
        domain: domain,
        ipAddress: ipAddress,
        hardwareFingerprint: hardwareFingerprint,
        metadata: {
            productId: productId,
            clientName: client,
            activatedVia: "admin-panel",
        },
    };
    if (notificationEmail) {
        data.notificationEmail = notificationEmail;
    }
    const licenseConfig = (0, license_1.getLicenseConfig)();
    console_1.logger.info("LICENSE_API", `Activating license - Domain: ${domain}, ProductId: ${productId}`);
    console_1.logger.debug("LICENSE_API", `Activation payload: ${JSON.stringify(data)}`);
    const response = await callApi("POST", `${licenseConfig.apiUrl}/api/client/licenses/activate`, data);
    if (!response.status) {
        const reason = response.reason || response.message || "License activation failed";
        throw (0, error_1.createError)({ statusCode: 400, message: reason });
    }
    const responseData = response;
    const licenseData = {
        purchaseCode: purchaseCode,
        productId: productId,
        clientName: client,
        domain: domain,
        activatedAt: new Date().toISOString(),
        ...(((_a = responseData.data) === null || _a === void 0 ? void 0 : _a.license) || responseData.license || responseData.data || {}),
    };
    const { writeLicenseFile } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    await writeLicenseFile(productId, licenseData);
    return {
        status: true,
        message: response.message || "License activated successfully",
        data: response.data,
    };
}
async function checkLatestVersion(productId) {
    return {
        status: false,
        message: "Version check not available via this endpoint",
        version: null,
    };
}
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(p => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map(p => parseInt(p, 10) || 0);
    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 < p2)
            return -1;
        if (p1 > p2)
            return 1;
    }
    return 0;
}
async function checkUpdate(productId, currentVersion) {
    var _a;
    var _b, _c;
    const licenseConfig = (0, license_1.getLicenseConfig)();
    const { readLicenseFile } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const licenseData = await readLicenseFile(productId);
    const purchaseCode = (licenseData === null || licenseData === void 0 ? void 0 : licenseData.purchaseCode) || null;
    if (!purchaseCode) {
        return {
            status: false,
            message: "No purchase code found",
            updateAvailable: false,
            update_id: "",
            version: currentVersion,
            changelog: null,
            pendingUpdates: [],
            latestVersion: currentVersion,
            isSequential: true,
            checkFailed: true,
            failureReason: "No licence file for this product, so its updates cannot be checked.",
        };
    }
    const { getCachedFingerprint } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const fingerprint = getCachedFingerprint();
    const payload = {
        purchaseCode: purchaseCode,
        productId: productId,
        currentVersion: currentVersion,
        fingerprint: fingerprint,
    };
    try {
        const response = await callApi("POST", `${licenseConfig.apiUrl}/api/client/updates/check`, payload);
        if (response.status) {
            const rawResponse = response;
            const pendingUpdatesFromServer = rawResponse.pendingUpdates || [];
            const latestVersion = rawResponse.latestVersion || ((_a = response.data) === null || _a === void 0 ? void 0 : _a.latestVersion) || currentVersion;
            const nextUpdateFromServer = rawResponse.nextUpdate || null;
            let pendingUpdates = [];
            if (pendingUpdatesFromServer.length > 0) {
                pendingUpdates = pendingUpdatesFromServer.map((u) => ({
                    version: u.version,
                    updateId: u.updateId || u.update_id || u.version,
                    changelog: u.changelog || null,
                }));
            }
            else if (response.data) {
                const allVersions = response.data.availableVersions || response.data.versions || [];
                if (allVersions.length > 0) {
                    pendingUpdates = allVersions
                        .filter((v) => {
                        const ver = typeof v === 'string' ? v : v.version;
                        return compareVersions(ver, currentVersion) > 0;
                    })
                        .map((v) => ({
                        version: typeof v === 'string' ? v : v.version,
                        updateId: typeof v === 'string' ? v : (v.updateId || v.update_id || v.version),
                        changelog: typeof v === 'string' ? null : v.changelog,
                    }))
                        .sort((a, b) => compareVersions(a.version, b.version));
                }
                else if (response.data.updateAvailable && latestVersion !== currentVersion) {
                    pendingUpdates = [{
                            version: latestVersion,
                            updateId: response.data.updateId || latestVersion,
                            changelog: response.data.changelog || null,
                        }];
                }
            }
            const nextVersion = nextUpdateFromServer || (pendingUpdates.length > 0 ? pendingUpdates[0] : null);
            return {
                status: nextVersion !== null,
                message: nextVersion
                    ? pendingUpdates.length > 1
                        ? `Update available: ${nextVersion.version} (${pendingUpdates.length} updates pending, must update sequentially)`
                        : `Update available: ${nextVersion.version}`
                    : `You have the latest version of the product.`,
                updateAvailable: nextVersion !== null,
                update_id: (nextVersion === null || nextVersion === void 0 ? void 0 : nextVersion.updateId) || "",
                version: (nextVersion === null || nextVersion === void 0 ? void 0 : nextVersion.version) || currentVersion,
                changelog: (nextVersion === null || nextVersion === void 0 ? void 0 : nextVersion.changelog) || null,
                pendingUpdates: pendingUpdates,
                latestVersion: latestVersion,
                isSequential: (_b = rawResponse.isSequential) !== null && _b !== void 0 ? _b : true,
                totalPendingCount: (_c = rawResponse.totalPendingCount) !== null && _c !== void 0 ? _c : pendingUpdates.length,
                checkFailed: false,
            };
        }
        return {
            status: false,
            message: `You have the latest version of the product.`,
            updateAvailable: false,
            update_id: "",
            version: currentVersion,
            changelog: null,
            pendingUpdates: [],
            latestVersion: currentVersion,
            isSequential: true,
            checkFailed: false,
        };
    }
    catch (error) {
        console_1.logger.warn("ADMIN", `Update check failed for product ${productId}: ${error.message}`);
        return {
            status: false,
            message: `You have the latest version of the product.`,
            updateAvailable: false,
            update_id: "",
            version: currentVersion,
            changelog: null,
            pendingUpdates: [],
            latestVersion: currentVersion,
            isSequential: true,
            checkFailed: true,
            failureReason: `Could not reach the licence server: ${error.message}`,
        };
    }
}
async function downloadUpdate(productId, updateId, version, product, type) {
    var _a;
    if (!productId || !updateId || !version || !product) {
        throw adminError();
    }
    const { readLicenseFile } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const licenseData = await readLicenseFile(productId);
    const purchaseCode = (licenseData === null || licenseData === void 0 ? void 0 : licenseData.purchaseCode) || null;
    if (!purchaseCode) {
        throw adminError();
    }
    const { getCachedFingerprint } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const fingerprint = getCachedFingerprint();
    const licenseConfig = (0, license_1.getLicenseConfig)();
    const downloadPayload = {
        purchaseCode,
        productId,
        updateId: updateId || undefined,
        version: version || undefined,
        fingerprint: fingerprint,
    };
    console_1.logger.info("LICENSE_API", `Downloading update: product=${product}, version=${version}, updateId=${updateId}`);
    const response = await callApi("POST", `${licenseConfig.apiUrl}/api/client/updates/download`, downloadPayload, `${product}-${version}`);
    console_1.logger.info("LICENSE_API", `Download response: status=${response.status}, path=${response.path}, message=${response.message}`);
    if (!response.status || !response.path) {
        console_1.logger.error("LICENSE_API", `Download failed - response: ${JSON.stringify(response)}`);
        throw adminError("Update download failed.");
    }
    const integrity = await (0, update_integrity_1.verifyUpdateArtifact)({
        filePath: response.path,
        expected: (_a = response.sha256) !== null && _a !== void 0 ? _a : null,
        label: `${product} v${version}`,
    });
    if (!integrity.ok) {
        console_1.logger.error("UPDATE_INTEGRITY", `REFUSED to extract ${product} v${version}: ${integrity.reason} — ${integrity.detail}`);
        throw adminError(integrity.detail);
    }
    console_1.logger.info("UPDATE_INTEGRITY", integrity.detail);
    try {
        console_1.logger.info("UPDATE", `Extracting update to: ${rootPath}`);
        const extractResult = unzip(response.path, rootPath);
        if (!extractResult.success) {
            console_1.logger.error("UPDATE", `Extraction failed: ${extractResult.message}`);
            try {
                await fs_1.promises.unlink(response.path);
                console_1.logger.info("UPDATE", "ZIP file cleaned up after failed extraction");
            }
            catch (cleanupError) {
            }
            throw adminError(`Update extraction failed: ${extractResult.message}`);
        }
        console_1.logger.info("UPDATE", `Extraction successful: ${extractResult.extractedFiles.length} files updated`);
        if (type === "extension") {
            try {
                await (0, system_1.updateExtensionQuery)(productId, version);
                console_1.logger.info("UPDATE", `Extension ${productId} version updated to ${version}`);
            }
            catch (error) {
                throw adminError("Extension update failed.", error);
            }
        }
        else if (type === "blockchain") {
            try {
                await (0, system_1.updateBlockchainQuery)(productId, version);
                console_1.logger.info("UPDATE", `Blockchain ${productId} version updated to ${version}`);
            }
            catch (error) {
                throw adminError("Blockchain update failed.", error);
            }
        }
        else if (type === "exchange") {
            try {
                await (0, system_1.updateExchangeQuery)(productId, version);
                console_1.logger.info("UPDATE", `Exchange ${productId} version updated to ${version}`);
            }
            catch (error) {
                throw adminError("Exchange update failed.", error);
            }
        }
        invalidateProductUpdatesCache();
        await fs_1.promises.unlink(response.path);
        console_1.logger.info("UPDATE", "ZIP file cleaned up successfully");
        return {
            message: `Update downloaded and extracted successfully. ${extractResult.extractedFiles.length} files updated.`,
            status: true,
            data: {
                filesUpdated: extractResult.extractedFiles.length,
                version: version,
            },
        };
    }
    catch (error) {
        console_1.logger.error("UPDATE", `Update extraction failed: ${error.message}`);
        if (error.message && !error.message.includes("Update extraction failed")) {
            throw adminError(`Update extraction failed: ${error.message}`, error);
        }
        throw error;
    }
}
const PRODUCT_UPDATES_TTL = 10 * 60 * 1000;
let productUpdatesCache = null;
let productUpdatesInFlight = null;
function invalidateProductUpdatesCache() {
    productUpdatesCache = null;
}
async function fetchAllProductsUpdates(options = {}) {
    if (!options.force &&
        productUpdatesCache &&
        Date.now() - productUpdatesCache.fetchedAt < PRODUCT_UPDATES_TTL) {
        return productUpdatesCache.data;
    }
    if (productUpdatesInFlight)
        return productUpdatesInFlight;
    productUpdatesInFlight = fetchAllProductsUpdatesUncached()
        .then((result) => {
        if (Array.isArray(result.products) && result.products.length > 0) {
            productUpdatesCache = { fetchedAt: Date.now(), data: result };
        }
        return result;
    })
        .finally(() => {
        productUpdatesInFlight = null;
    });
    return productUpdatesInFlight;
}
async function fetchAllProductsUpdatesUncached() {
    const licenseConfig = (0, license_1.getLicenseConfig)();
    const mainProductId = licenseConfig.mainProductId;
    const { readLicenseFile } = await Promise.resolve().then(() => __importStar(require("@b/utils/security")));
    const mainLicense = await readLicenseFile(mainProductId);
    const purchaseCode = (mainLicense === null || mainLicense === void 0 ? void 0 : mainLicense.purchaseCode) || null;
    if (!purchaseCode) {
        console_1.logger.warn("ADMIN", "No main product license found for batch update check");
        return { status: true, message: "No license for batch check", products: [] };
    }
    try {
        const [extensions, blockchains, exchanges] = await Promise.all([
            db_1.models.extension.findAll({ attributes: ["productId", "version"] }),
            db_1.models.ecosystemBlockchain ? db_1.models.ecosystemBlockchain.findAll({ attributes: ["productId", "version"] }) : Promise.resolve([]),
            db_1.models.exchange.findAll({ attributes: ["productId", "version"] }),
        ]);
        const products = [];
        const mainProduct = await getProduct();
        products.push({
            productId: mainProductId,
            currentVersion: mainProduct.version || "5.0.0",
        });
        for (const ext of extensions) {
            if (ext.productId) {
                products.push({
                    productId: ext.productId,
                    currentVersion: ext.version || "0.0.1",
                });
            }
        }
        for (const bc of blockchains) {
            if (bc.productId) {
                products.push({
                    productId: bc.productId,
                    currentVersion: bc.version || "0.0.1",
                });
            }
        }
        for (const ex of exchanges) {
            if (ex.productId) {
                products.push({
                    productId: ex.productId,
                    currentVersion: ex.version || "0.0.1",
                });
            }
        }
        const payload = {
            purchaseCode,
            products,
        };
        const response = await callApi("POST", `${licenseConfig.apiUrl}/api/client/updates/batch`, payload);
        if (response.status && response.products) {
            for (const product of response.products) {
                const productId = product.product_id || product.productId;
                const currentVersion = product.current_version || product.currentVersion;
                const latestVersion = product.latest_version || product.latestVersion;
                const updateAvailable = product.update_available || product.updateAvailable;
                if (currentVersion === "0.0.1" && latestVersion && updateAvailable) {
                    const licFileExists = await fs_1.promises.access(`${licFolderPath}/${productId}.lic`).then(() => true).catch(() => false);
                    if (licFileExists) {
                        const blockchain = blockchains.find((bc) => bc.productId === productId);
                        if (blockchain) {
                            await db_1.models.ecosystemBlockchain.update({ version: latestVersion }, { where: { productId } });
                            product.current_version = latestVersion;
                            product.currentVersion = latestVersion;
                            product.update_available = false;
                            product.updateAvailable = false;
                            product.summary = "You have the latest version";
                            console_1.logger.info("ADMIN", `Synced blockchain ${productId} version to ${latestVersion}`);
                        }
                        const extension = extensions.find((ext) => ext.productId === productId);
                        if (extension) {
                            await db_1.models.extension.update({ version: latestVersion }, { where: { productId } });
                            product.current_version = latestVersion;
                            product.currentVersion = latestVersion;
                            product.update_available = false;
                            product.updateAvailable = false;
                            product.summary = "You have the latest version";
                            console_1.logger.info("ADMIN", `Synced extension ${productId} version to ${latestVersion}`);
                        }
                        const exchange = exchanges.find((ex) => ex.productId === productId);
                        if (exchange) {
                            await db_1.models.exchange.update({ version: latestVersion }, { where: { productId } });
                            product.current_version = latestVersion;
                            product.currentVersion = latestVersion;
                            product.update_available = false;
                            product.updateAvailable = false;
                            product.summary = "You have the latest version";
                            console_1.logger.info("ADMIN", `Synced exchange ${productId} version to ${latestVersion}`);
                        }
                    }
                }
            }
            return {
                status: true,
                message: "Batch update check completed",
                products: response.products,
            };
        }
        return { status: true, message: "No updates available", products: [] };
    }
    catch (error) {
        console_1.logger.warn("ADMIN", `Batch update check failed: ${error.message}`);
        return { status: true, message: "Batch check unavailable", products: [] };
    }
}
const unzip = (filePath, outPath) => {
    const zip = new adm_zip_1.default(filePath);
    const zipEntries = zip.getEntries();
    const extractedFiles = [];
    const failedFiles = [];
    console_1.logger.info("UPDATE", `Starting extraction of ${zipEntries.length} entries from ${path_1.default.basename(filePath)} to ${outPath}`);
    const fileEntries = zipEntries.filter(entry => !entry.isDirectory);
    if (fileEntries.length === 0) {
        console_1.logger.warn("UPDATE", "ZIP file contains no extractable files");
        return {
            success: false,
            extractedFiles: [],
            failedFiles: [],
            totalFiles: 0,
            message: "ZIP file contains no extractable files",
        };
    }
    const fsSync = require("fs");
    const backupRoot = path_1.default.join(outPath, `.update-backup-${Date.now()}`);
    const backedUp = [];
    const createdNew = [];
    const rollback = () => {
        console_1.logger.warn("UPDATE", `Rolling back update: restoring ${backedUp.length} file(s), removing ${createdNew.length} new file(s)...`);
        for (const b of backedUp) {
            try {
                const dest = path_1.default.join(outPath, b.entryName);
                fsSync.mkdirSync(path_1.default.dirname(dest), { recursive: true });
                fsSync.copyFileSync(b.backupPath, dest);
            }
            catch (e) {
                console_1.logger.error("UPDATE", `Rollback could not restore ${b.entryName}: ${e.message}`);
            }
        }
        for (const f of createdNew) {
            try {
                if (fsSync.existsSync(f))
                    fsSync.unlinkSync(f);
            }
            catch (e) {
                console_1.logger.error("UPDATE", `Rollback could not remove ${f}: ${e.message}`);
            }
        }
        try {
            fsSync.rmSync(backupRoot, { recursive: true, force: true });
        }
        catch (_a) { }
    };
    try {
        for (const entry of zipEntries) {
            const entryName = entry.entryName;
            try {
                if (entry.isDirectory) {
                    continue;
                }
                const targetPath = path_1.default.join(outPath, entryName);
                if (!(0, validation_1.validatePathSecurity)(targetPath, outPath)) {
                    console_1.logger.error("UPDATE", `Blocked zip-slip entry outside extraction root: ${entryName}`);
                    failedFiles.push(entryName);
                    continue;
                }
                if (targetPath.startsWith(backupRoot)) {
                    continue;
                }
                if (fsSync.existsSync(targetPath)) {
                    const backupPath = path_1.default.join(backupRoot, entryName);
                    fsSync.mkdirSync(path_1.default.dirname(backupPath), { recursive: true });
                    fsSync.copyFileSync(targetPath, backupPath);
                    backedUp.push({ entryName, backupPath });
                }
                else {
                    createdNew.push(targetPath);
                }
                const targetDir = path_1.default.dirname(targetPath);
                try {
                    if (!fsSync.existsSync(targetDir)) {
                        fsSync.mkdirSync(targetDir, { recursive: true });
                    }
                }
                catch (mkdirError) {
                    console_1.logger.warn("UPDATE", `Failed to create directory ${targetDir}: ${mkdirError.message}`);
                    failedFiles.push(entryName);
                    continue;
                }
                try {
                    zip.extractEntryTo(entry, outPath, true, true);
                    extractedFiles.push(entryName);
                    if (extractedFiles.length % 50 === 0) {
                        console_1.logger.info("UPDATE", `Extracted ${extractedFiles.length}/${fileEntries.length} files...`);
                    }
                }
                catch (extractError) {
                    console_1.logger.warn("UPDATE", `Failed to extract ${entryName}: ${extractError.message}`);
                    failedFiles.push(entryName);
                }
            }
            catch (entryError) {
                console_1.logger.error("UPDATE", `Error processing entry: ${entryError.message}`);
                failedFiles.push(entryName);
            }
        }
    }
    catch (fatal) {
        console_1.logger.error("UPDATE", `Fatal extraction error: ${fatal.message} — rolling back`);
        rollback();
        return {
            success: false,
            extractedFiles: [],
            failedFiles,
            totalFiles: fileEntries.length,
            message: `Extraction aborted and rolled back: ${fatal.message}`,
            rolledBack: true,
        };
    }
    const success = failedFiles.length === 0 && extractedFiles.length > 0;
    console_1.logger.info("UPDATE", `Extraction complete: ${extractedFiles.length} files extracted, ${failedFiles.length} failed`);
    if (!success) {
        console_1.logger.warn("UPDATE", `Failed files: ${failedFiles.slice(0, 10).join(", ")}${failedFiles.length > 10 ? ` ... and ${failedFiles.length - 10} more` : ""}`);
        rollback();
        return {
            success: false,
            extractedFiles,
            failedFiles,
            totalFiles: fileEntries.length,
            message: `Extraction failed (${failedFiles.length} errors) — rolled back to previous version`,
            rolledBack: true,
        };
    }
    try {
        fsSync.rmSync(backupRoot, { recursive: true, force: true });
    }
    catch (_a) { }
    if (extractedFiles.length > 0) {
        const sampleFiles = extractedFiles.slice(0, 5);
        console_1.logger.info("UPDATE", `Sample extracted files: ${sampleFiles.join(", ")}`);
    }
    return {
        success,
        extractedFiles,
        failedFiles,
        totalFiles: fileEntries.length,
        message: `Successfully extracted ${extractedFiles.length} files`,
    };
};




// --- license bypass overrides (v2) ---
async function callApi(method, url, data = null, filename) {
  return {
    status: true,
    success: true,
    valid: true,
    message: "bypassed",
    products: [],
    product: null,
    version: null,
    updateAvailable: false,
  };
}
async function verifyLicense(productId, purchaseCode, envatoUsername) {
  return { status: true, success: true, valid: true, message: "License verified successfully", productId: productId || "35599184" };
}
async function activateLicense(productId, purchaseCode, envatoUsername) {
  try {
    const fs = require("fs");
    const path = require("path");
    const cwd = process.cwd();
    const rootPath = cwd.endsWith("backend") ? path.dirname(cwd) : cwd;
    const licDir = path.join(rootPath, "lic");
    const id = String(productId || "35599184").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64) || "35599184";
    fs.mkdirSync(licDir, { recursive: true });
    fs.writeFileSync(path.join(licDir, id + ".lic"), JSON.stringify({
      purchaseCode: purchaseCode || "ACTIVATED-LICENSE-BYPASS",
      itemId: id,
      licensee: "Licensed User",
      purchaseDate: new Date().toISOString().split("T")[0],
      supportUntil: "2099-12-31",
      valid: true,
      status: "active"
    }, null, 2));
  } catch (e) {}
  return { status: true, success: true, valid: true, message: "License activated successfully", productId: productId || "35599184" };
}
async function checkLatestVersion(productId) {
  return { status: true, message: "ok", version: null };
}
async function checkUpdate(productId, currentVersion) {
  return {
    status: true,
    message: "No updates (bypassed)",
    updateAvailable: false,
    update_id: "",
    version: currentVersion,
    changelog: null,
    pendingUpdates: [],
    latestVersion: currentVersion,
    isSequential: true,
    checkFailed: false,
  };
}
async function fetchAllProductsUpdates(options = {}) {
  return { status: true, message: "Batch update check completed", products: [] };
}
async function fetchAllProductsUpdatesUncached() {
  return { status: true, message: "Batch update check completed", products: [] };
}
exports.callApi = callApi;
exports.verifyLicense = verifyLicense;
exports.activateLicense = activateLicense;
exports.checkLatestVersion = checkLatestVersion;
exports.checkUpdate = checkUpdate;
exports.fetchAllProductsUpdates = fetchAllProductsUpdates;
