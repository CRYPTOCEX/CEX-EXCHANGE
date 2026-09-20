"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOneNewsProvider = syncOneNewsProvider;
exports.syncAllNewsProviders = syncAllNewsProviders;
const crypto_1 = require("crypto");
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const seed_1 = require("./providers/seed");
const config_1 = require("./providers/config");
const registry_1 = require("./providers/registry");
function hashKey(parts) {
    return (0, crypto_1.createHash)("sha256")
        .update(parts.map((part) => String(part !== null && part !== void 0 ? part : "")).join("|"), "utf8")
        .digest("hex")
        .slice(0, 32);
}
async function insertNewRows(rows) {
    const ids = rows.map((row) => row.externalId);
    const existing = await db_1.models.marketNews.findAll({
        where: { externalId: { [sequelize_1.Op.in]: ids } },
        attributes: ["externalId"],
    });
    const seen = new Set(existing.map((row) => String(row.externalId)));
    const toCreate = rows.filter((row) => !seen.has(row.externalId));
    if (toCreate.length === 0)
        return 0;
    try {
        await db_1.models.marketNews.bulkCreate(toCreate, { ignoreDuplicates: true });
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.name) !== "SequelizeUniqueConstraintError")
            throw error;
    }
    return toCreate.length;
}
function toRow(provider, item) {
    var _a, _b, _c, _d, _e;
    return {
        externalId: item.externalId
            ? `${provider}:${item.externalId}`
            : `${provider}:${hashKey([item.publishedAt, item.headline])}`,
        source: "PROVIDER",
        provider,
        publishedAt: new Date(item.publishedAt),
        headline: item.headline,
        summary: (_a = item.summary) !== null && _a !== void 0 ? _a : null,
        url: (_b = item.url) !== null && _b !== void 0 ? _b : null,
        imageUrl: (_c = item.imageUrl) !== null && _c !== void 0 ? _c : null,
        category: (_d = item.category) !== null && _d !== void 0 ? _d : null,
        relatedSymbols: (_e = item.relatedSymbols) !== null && _e !== void 0 ? _e : null,
    };
}
async function prune(provider, retentionDays) {
    try {
        await db_1.models.marketNews.destroy({
            where: {
                source: "PROVIDER",
                provider,
                publishedAt: {
                    [sequelize_1.Op.lt]: new Date(Date.now() - retentionDays * 86400000),
                },
            },
        });
    }
    catch (error) {
        console_1.logger.warn("NEWS", `market news prune failed for ${provider}: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
async function pruneOrphans(retentionDays) {
    try {
        await db_1.models.marketNews.destroy({
            where: {
                source: "PROVIDER",
                provider: null,
                publishedAt: {
                    [sequelize_1.Op.lt]: new Date(Date.now() - retentionDays * 86400000),
                },
            },
        });
    }
    catch (error) {
        console_1.logger.warn("NEWS", `market news orphan prune failed: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
async function syncOneNewsProvider(row) {
    var _a;
    const provider = String(row.name);
    const readiness = (0, registry_1.newsProviderReadiness)(provider, (0, config_1.readProviderConfig)(row.config), row.apiKey);
    if (!readiness.ready) {
        const message = !readiness.adapterAvailable
            ? `No adapter is implemented for "${provider}" in this release`
            : readiness.missingCredentials.length > 0
                ? `Not configured — add a credential in Admin → News Providers, or set ${readiness.missingCredentials.join(", ")} in the server environment`
                : ((_a = readiness.configProblem) !== null && _a !== void 0 ? _a : "Not configured");
        await record(row, "SKIPPED", 0, message);
        console_1.logger.info("NEWS", `${provider} skipped: ${message}`);
        return { provider, status: "SKIPPED", inserted: 0, message };
    }
    const result = await (0, registry_1.runNewsProvider)(row);
    if (!result.ok) {
        await record(row, "ERROR", 0, result.error.message);
        console_1.logger.warn("NEWS", `${provider} sync failed: ${result.error.message}`);
        return { provider, status: "ERROR", inserted: 0, message: result.error.message };
    }
    if (result.items.length === 0) {
        const message = "The provider returned no stories";
        await record(row, "EMPTY", 0, message);
        return { provider, status: "EMPTY", inserted: 0, message };
    }
    let inserted = 0;
    try {
        inserted = await insertNewRows(result.items.map((item) => toRow(provider, item)));
    }
    catch (error) {
        const message = `Fetched ${result.items.length} stories but the write failed: ${error === null || error === void 0 ? void 0 : error.message}`;
        await record(row, "ERROR", 0, message);
        console_1.logger.warn("NEWS", `${provider}: ${message}`);
        return { provider, status: "ERROR", inserted: 0, message };
    }
    const message = `Fetched ${result.items.length} stories, ${inserted} of them new`;
    await record(row, "OK", inserted, message);
    return { provider, status: "OK", inserted, message };
}
async function record(row, status, inserted, message) {
    try {
        await row.update({
            lastSyncAt: new Date(),
            lastSyncStatus: status,
            lastSyncCount: inserted,
            lastSyncMessage: message.slice(0, 2000),
        });
    }
    catch (error) {
        console_1.logger.warn("NEWS", `could not record sync state for ${row === null || row === void 0 ? void 0 : row.name}: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
}
async function syncAllNewsProviders() {
    const summary = { news: 0, results: [] };
    try {
        await (0, seed_1.ensureSeedNewsProviders)();
    }
    catch (error) {
        console_1.logger.warn("NEWS", `could not seed the news provider catalogue: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    let rows = [];
    try {
        rows = await db_1.models.marketNewsProvider.findAll({ order: [["name", "ASC"]] });
    }
    catch (error) {
        console_1.logger.warn("NEWS", `could not read the news provider table: ${error === null || error === void 0 ? void 0 : error.message}`);
        return summary;
    }
    const enabled = rows.filter((row) => !!row.status);
    if (enabled.length === 0) {
        console_1.logger.info("NEWS", "no market news provider is enabled — operator-authored rows still serve the feed (Admin → News Providers)");
    }
    for (const row of enabled) {
        const result = await syncOneNewsProvider(row);
        summary.results.push(result);
        summary.news += result.inserted;
    }
    let maxRetention = 30;
    for (const row of rows) {
        const retentionDays = Number(row.retentionDays) || 30;
        maxRetention = Math.max(maxRetention, retentionDays);
        await prune(String(row.name), retentionDays);
    }
    await pruneOrphans(maxRetention);
    return summary;
}
