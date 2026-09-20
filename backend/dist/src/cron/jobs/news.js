"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMarketNews = syncMarketNews;
const sync_1 = require("@b/utils/news/sync");
async function syncMarketNews() {
    const summary = await (0, sync_1.syncAllNewsProviders)();
    return { news: summary.news };
}
