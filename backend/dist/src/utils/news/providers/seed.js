"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSeedNewsProviders = ensureSeedNewsProviders;
const db_1 = require("@b/db");
const catalog_1 = require("./catalog");
async function ensureSeedNewsProviders() {
    let created = 0;
    for (const profile of catalog_1.NEWS_PROVIDER_CATALOG) {
        const [row, wasCreated] = await db_1.models.marketNewsProvider.findOrCreate({
            where: { name: profile.name },
            defaults: {
                name: profile.name,
                title: profile.title,
                description: profile.description,
                status: profile.name === "finnhub" && !!process.env.APP_FINNHUB_API_KEY,
                categories: profile.defaultCategories,
                fetchLimit: 60,
                retentionDays: 30,
                config: null,
            },
        });
        if (wasCreated) {
            created++;
            continue;
        }
        if (row.title !== profile.title ||
            row.description !== profile.description) {
            await row.update({
                title: profile.title,
                description: profile.description,
            });
        }
    }
    return created;
}
