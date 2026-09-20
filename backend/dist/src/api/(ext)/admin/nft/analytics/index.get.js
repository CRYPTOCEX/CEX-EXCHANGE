"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
const console_1 = require("@b/utils/console");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get comprehensive NFT marketplace analytics and metrics",
    description: "Retrieves detailed analytics for the NFT marketplace including overview statistics, growth trends, top collections and creators by USD volume, recent sales, and chart data for visualization. Supports configurable time ranges (7d, 30d, 90d, 1y). Every money figure is priced into USD per currency before it is summed; denominations that could not be priced are listed in unpricedCurrencies and excluded.",
    operationId: "getNftAnalytics",
    tags: ["Admin", "NFT", "Analytics"],
    parameters: [
        {
            name: "timeRange",
            in: "query",
            description: "Time range for analytics",
            required: false,
            schema: {
                type: "string",
                enum: ["7d", "30d", "90d", "1y"],
                default: "30d"
            }
        }
    ],
    responses: {
        200: {
            description: "NFT marketplace analytics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                type: "object",
                                properties: {
                                    overview: {
                                        type: "object",
                                        properties: {
                                            totalCollections: { type: "number" },
                                            totalTokens: { type: "number" },
                                            totalListings: { type: "number" },
                                            totalSales: { type: "number" },
                                            totalVolume: {
                                                type: "number",
                                                description: "Completed sale volume in the selected window, in USD."
                                            },
                                            totalUsers: {
                                                type: "number",
                                                description: "Distinct wallets that appeared on EITHER side of an activity row inside the selected window."
                                            },
                                            totalActivity: {
                                                type: "number",
                                                description: "nftActivity rows recorded inside the selected window."
                                            },
                                            avgPrice: {
                                                type: "number",
                                                description: "USD volume divided by the sales that could be priced."
                                            }
                                        }
                                    },
                                    trends: {
                                        type: "object",
                                        description: "Percentage change against the equivalent preceding window. Null where the previous window was empty, because growth from zero has no percentage.",
                                        properties: {
                                            collectionsGrowth: { type: "number", nullable: true },
                                            tokensGrowth: { type: "number", nullable: true },
                                            volumeGrowth: { type: "number", nullable: true },
                                            salesGrowth: { type: "number", nullable: true }
                                        }
                                    },
                                    topCollections: {
                                        type: "array",
                                        description: "Ranked by USD volume over EVERY completed sale in the window, then truncated to ten.",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                currency: { type: "string" },
                                                volume: { type: "number" },
                                                sales: { type: "number" },
                                                floorPrice: {
                                                    type: "number",
                                                    nullable: true,
                                                    description: "Lowest ACTIVE fixed-price listing in USD. Null when there is none, or none that could be priced — zero would read as 'free'."
                                                }
                                            }
                                        }
                                    },
                                    topCreators: {
                                        type: "array",
                                        description: "Ranked by USD volume over EVERY completed sale in the window, then truncated to ten.",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                name: { type: "string" },
                                                email: { type: "string" },
                                                volume: { type: "number" },
                                                sales: { type: "number" },
                                                collections: {
                                                    type: "number",
                                                    description: "Collections the creator owns, all time."
                                                }
                                            }
                                        }
                                    },
                                    recentSales: { type: "array" },
                                    chartData: {
                                        type: "object",
                                        properties: {
                                            volumeChart: {
                                                type: "array",
                                                description: "One point per UTC day in the window, zero-filled. `volume` is USD.",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        date: { type: "string" },
                                                        volume: { type: "number" },
                                                        sales: { type: "number" }
                                                    }
                                                }
                                            },
                                            categoryChart: { type: "array" },
                                            chainChart: {
                                                type: "array",
                                                description: "`volume` is USD over the selected window."
                                            }
                                        }
                                    },
                                    unpricedCurrencies: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Currencies sales settled in that have no usable USD rate. Their volume is excluded from every USD figure, so a non-empty list makes those figures a lower bound."
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse
    },
    requiresAuth: true,
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Analytics",
    permission: "access.nft",
    demoMask: ["topCreators.email"],
};
exports.default = async (data) => {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const { query, ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Parse time range parameters");
        const timeRange = query.timeRange || "30d";
        const rates = new Map();
        const unpriced = new Set();
        const priced = (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0;
        const loadRates = async (currencies) => {
            const missing = [...new Set(currencies)].filter((c) => Boolean(c) && !rates.has(c));
            if (!missing.length)
                return;
            try {
                const resolved = await (0, utils_1.getUsdRates)(missing);
                for (const [currency, rate] of resolved)
                    rates.set(currency, rate);
                if (missing.includes("USDT") && !priced(rates.get("USDT"))) {
                    rates.set("USDT", await (0, utils_1.getUsdtPriceInUSD)());
                }
            }
            catch (error) {
                console_1.logger.warn("NFT", "USD rate lookup failed, volumes will be reported as unpriced", error);
            }
        };
        const toUSD = (amount, currency) => {
            if (!Number.isFinite(amount))
                return null;
            const rate = currency ? rates.get(currency) : undefined;
            if (!priced(rate)) {
                unpriced.add(currency || "UNKNOWN");
                return null;
            }
            return amount * rate;
        };
        const delta = (current, previous) => {
            if (!Number.isFinite(current) || !Number.isFinite(previous))
                return null;
            if (previous === 0)
                return null;
            return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
        };
        const now = new Date();
        let startDate;
        let previousStartDate;
        switch (timeRange) {
            case "7d":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                break;
            case "1y":
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        }
        const DAY_MS = 24 * 60 * 60 * 1000;
        const utcDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        const dayAxis = [];
        for (let t = utcDay(startDate); t <= utcDay(now); t += DAY_MS) {
            dayAxis.push(new Date(t).toISOString().slice(0, 10));
        }
        const dayBucket = (0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m-%d");
        const [totalCollections, totalTokens, totalListings, totalSales, participantRows, totalActivity, currentSaleRows, previousSaleRows, currentCollections, previousCollections, currentTokens, previousTokens, collectionSaleRows, floorRows, collectionsPerChain, recentSales, categoryChart] = await Promise.all([
            db_1.models.nftCollection.count(),
            db_1.models.nftToken.count({ where: { isMinted: true } }),
            db_1.models.nftListing.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftSale.count({ where: { status: "COMPLETED" } }),
            db_1.sequelize.query(`SELECT COUNT(*) AS count FROM (
           SELECT fromUserId AS userId FROM nft_activity
            WHERE fromUserId IS NOT NULL AND deletedAt IS NULL AND createdAt >= :startDate
           UNION
           SELECT toUserId AS userId FROM nft_activity
            WHERE toUserId IS NOT NULL AND deletedAt IS NULL AND createdAt >= :startDate
         ) participants`, { replacements: { startDate }, type: sequelize_1.QueryTypes.SELECT }),
            db_1.models.nftActivity.count({ where: { createdAt: { [sequelize_1.Op.gte]: startDate } } }),
            db_1.models.nftSale.findAll({
                attributes: [
                    [dayBucket, "day"],
                    "currency",
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("price")), "volume"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "sales"]
                ],
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.gte]: startDate }
                },
                group: [dayBucket, "currency"],
                order: [[dayBucket, "ASC"]],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    "currency",
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("price")), "volume"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "sales"]
                ],
                where: {
                    status: "COMPLETED",
                    createdAt: {
                        [sequelize_1.Op.gte]: previousStartDate,
                        [sequelize_1.Op.lt]: startDate
                    }
                },
                group: ["currency"],
                raw: true
            }),
            db_1.models.nftCollection.count({
                where: { createdAt: { [sequelize_1.Op.gte]: startDate } }
            }),
            db_1.models.nftCollection.count({
                where: {
                    createdAt: {
                        [sequelize_1.Op.gte]: previousStartDate,
                        [sequelize_1.Op.lt]: startDate
                    }
                }
            }),
            db_1.models.nftToken.count({
                where: { createdAt: { [sequelize_1.Op.gte]: startDate } }
            }),
            db_1.models.nftToken.count({
                where: {
                    createdAt: {
                        [sequelize_1.Op.gte]: previousStartDate,
                        [sequelize_1.Op.lt]: startDate
                    }
                }
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    [(0, sequelize_1.col)("token.collection.id"), "collectionId"],
                    [(0, sequelize_1.col)("token.collection.name"), "collectionName"],
                    [(0, sequelize_1.col)("token.collection.chain"), "chain"],
                    [(0, sequelize_1.col)("token.collection.creatorId"), "creatorId"],
                    [(0, sequelize_1.col)("nftSale.currency"), "currency"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("nftSale.price")), "volume"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("nftSale.id")), "sales"]
                ],
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: [],
                        required: true,
                        include: [
                            {
                                model: db_1.models.nftCollection,
                                as: "collection",
                                attributes: [],
                                required: true
                            }
                        ]
                    }
                ],
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.gte]: startDate }
                },
                group: [
                    "token.collection.id",
                    "token.collection.name",
                    "token.collection.chain",
                    "token.collection.creatorId",
                    "nftSale.currency"
                ],
                raw: true
            }),
            db_1.models.nftListing.findAll({
                attributes: [
                    [(0, sequelize_1.col)("token.collectionId"), "collectionId"],
                    [(0, sequelize_1.col)("nftListing.currency"), "currency"],
                    [(0, sequelize_1.fn)("MIN", (0, sequelize_1.col)("nftListing.price")), "floor"]
                ],
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: [],
                        required: true
                    }
                ],
                where: { status: "ACTIVE", type: "FIXED_PRICE" },
                group: ["token.collectionId", "nftListing.currency"],
                raw: true
            }),
            db_1.models.nftCollection.findAll({
                attributes: ["chain", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "collections"]],
                group: ["chain"],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: ['id', 'price', 'currency', 'createdAt'],
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: 'token',
                        attributes: ['name'],
                        include: [
                            {
                                model: db_1.models.nftCollection,
                                as: 'collection',
                                attributes: ['name']
                            }
                        ]
                    },
                    {
                        model: db_1.models.user,
                        as: 'buyer',
                        attributes: [
                            [(0, sequelize_1.fn)('CONCAT', (0, sequelize_1.col)('buyer.firstName'), ' ', (0, sequelize_1.col)('buyer.lastName')), 'name']
                        ]
                    },
                    {
                        model: db_1.models.user,
                        as: 'seller',
                        attributes: [
                            [(0, sequelize_1.fn)('CONCAT', (0, sequelize_1.col)('seller.firstName'), ' ', (0, sequelize_1.col)('seller.lastName')), 'name']
                        ]
                    }
                ],
                where: { status: "COMPLETED" },
                order: [['createdAt', 'DESC']],
                limit: 20
            }),
            db_1.models.nftCategory.findAll({
                attributes: [
                    'id',
                    'name',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('collections.id')), 'value']
                ],
                include: [
                    {
                        model: db_1.models.nftCollection,
                        as: 'collections',
                        attributes: [],
                        required: false
                    }
                ],
                group: ['nftCategory.id'],
                order: [[(0, sequelize_1.literal)('value'), 'DESC']]
            }).catch((error) => {
                console_1.logger.warn("NFT", "Category chart query failed, the category chart will render empty", error);
                return [];
            })
        ]);
        await loadRates([
            ...currentSaleRows.map((r) => r.currency),
            ...previousSaleRows.map((r) => r.currency),
            ...collectionSaleRows.map((r) => r.currency),
            ...floorRows.map((r) => r.currency)
        ]);
        const currentByCurrency = new Map();
        const volumeByDay = new Map();
        for (const row of currentSaleRows) {
            const currency = row.currency || "UNKNOWN";
            const volume = parseFloat((_b = row.volume) !== null && _b !== void 0 ? _b : "0") || 0;
            const sales = parseInt((_c = row.sales) !== null && _c !== void 0 ? _c : "0", 10) || 0;
            const forCurrency = (_d = currentByCurrency.get(currency)) !== null && _d !== void 0 ? _d : { volume: 0, sales: 0 };
            forCurrency.volume += volume;
            forCurrency.sales += sales;
            currentByCurrency.set(currency, forCurrency);
            const day = String(row.day);
            const forDay = (_e = volumeByDay.get(day)) !== null && _e !== void 0 ? _e : { volume: 0, sales: 0 };
            const dayUSD = toUSD(volume, row.currency);
            if (dayUSD !== null)
                forDay.volume += dayUSD;
            forDay.sales += sales;
            volumeByDay.set(day, forDay);
        }
        let currentVolumeUSD = 0;
        let currentSalesCount = 0;
        let pricedCurrentSales = 0;
        for (const [currency, agg] of currentByCurrency) {
            currentSalesCount += agg.sales;
            const totalUSD = toUSD(agg.volume, currency);
            if (totalUSD === null)
                continue;
            currentVolumeUSD += totalUSD;
            pricedCurrentSales += agg.sales;
        }
        let previousVolumeUSD = 0;
        let previousSalesCount = 0;
        for (const row of previousSaleRows) {
            previousSalesCount += parseInt((_f = row.sales) !== null && _f !== void 0 ? _f : "0", 10) || 0;
            const totalUSD = toUSD(parseFloat((_g = row.volume) !== null && _g !== void 0 ? _g : "0") || 0, row.currency);
            if (totalUSD === null)
                continue;
            previousVolumeUSD += totalUSD;
        }
        const avgPriceUSD = pricedCurrentSales > 0 ? currentVolumeUSD / pricedCurrentSales : 0;
        const volumeChart = dayAxis.map((date) => {
            var _a, _b;
            const bucket = volumeByDay.get(date);
            return {
                date,
                volume: Number(((_a = bucket === null || bucket === void 0 ? void 0 : bucket.volume) !== null && _a !== void 0 ? _a : 0).toFixed(2)),
                sales: (_b = bucket === null || bucket === void 0 ? void 0 : bucket.sales) !== null && _b !== void 0 ? _b : 0
            };
        });
        const trends = {
            collectionsGrowth: delta(currentCollections, previousCollections),
            tokensGrowth: delta(currentTokens, previousTokens),
            volumeGrowth: delta(currentVolumeUSD, previousVolumeUSD),
            salesGrowth: delta(currentSalesCount, previousSalesCount)
        };
        const collectionTotals = new Map();
        const chainVolume = new Map();
        const creatorTotals = new Map();
        for (const row of collectionSaleRows) {
            const volume = parseFloat((_h = row.volume) !== null && _h !== void 0 ? _h : "0") || 0;
            const sales = parseInt((_j = row.sales) !== null && _j !== void 0 ? _j : "0", 10) || 0;
            const volumeUSD = toUSD(volume, row.currency);
            const collection = (_k = collectionTotals.get(row.collectionId)) !== null && _k !== void 0 ? _k : {
                id: row.collectionId,
                name: row.collectionName || "Unknown",
                volume: 0,
                sales: 0
            };
            collection.volume += volumeUSD !== null && volumeUSD !== void 0 ? volumeUSD : 0;
            collection.sales += sales;
            collectionTotals.set(row.collectionId, collection);
            const chain = row.chain || "Unknown";
            chainVolume.set(chain, ((_l = chainVolume.get(chain)) !== null && _l !== void 0 ? _l : 0) + (volumeUSD !== null && volumeUSD !== void 0 ? volumeUSD : 0));
            if (row.creatorId) {
                const creator = (_m = creatorTotals.get(row.creatorId)) !== null && _m !== void 0 ? _m : { volume: 0, sales: 0 };
                creator.volume += volumeUSD !== null && volumeUSD !== void 0 ? volumeUSD : 0;
                creator.sales += sales;
                creatorTotals.set(row.creatorId, creator);
            }
        }
        const floorByCollection = new Map();
        for (const row of floorRows) {
            if (row.floor === null || row.floor === undefined)
                continue;
            const floor = parseFloat(row.floor);
            if (!Number.isFinite(floor) || floor <= 0)
                continue;
            const floorUSD = toUSD(floor, row.currency);
            if (floorUSD === null)
                continue;
            const current = floorByCollection.get(row.collectionId);
            if (current === undefined || floorUSD < current) {
                floorByCollection.set(row.collectionId, floorUSD);
            }
        }
        const formattedTopCollections = [...collectionTotals.values()]
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10)
            .map((collection) => ({
            id: collection.id,
            name: collection.name,
            currency: "USD",
            volume: Number(collection.volume.toFixed(2)),
            sales: collection.sales,
            floorPrice: floorByCollection.has(collection.id)
                ? Number(floorByCollection.get(collection.id).toFixed(2))
                : null
        }));
        const chainChart = collectionsPerChain
            .map((row) => {
            var _a, _b;
            const name = row.chain || "Unknown";
            return {
                name,
                volume: Number(((_a = chainVolume.get(name)) !== null && _a !== void 0 ? _a : 0).toFixed(2)),
                collections: parseInt((_b = row.collections) !== null && _b !== void 0 ? _b : "0", 10) || 0
            };
        })
            .sort((a, b) => b.volume - a.volume);
        const rankedCreatorIds = [...creatorTotals.entries()]
            .sort((a, b) => b[1].volume - a[1].volume)
            .slice(0, 10)
            .map(([id]) => id);
        const creatorRows = rankedCreatorIds.length
            ? (await db_1.models.nftCollection.findAll({
                attributes: [
                    "creatorId",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("nftCollection.id")), "collections"]
                ],
                include: [
                    {
                        model: db_1.models.nftCreator,
                        as: "creator",
                        attributes: ["displayName"],
                        required: true,
                        include: [
                            {
                                model: db_1.models.user,
                                as: "user",
                                attributes: ["firstName", "lastName", "email"],
                                required: true
                            }
                        ]
                    }
                ],
                where: { creatorId: { [sequelize_1.Op.in]: rankedCreatorIds } },
                group: [
                    "nftCollection.creatorId",
                    "creator.displayName",
                    "creator.user.firstName",
                    "creator.user.lastName",
                    "creator.user.email"
                ],
                raw: true
            }))
            : [];
        const creatorById = new Map();
        for (const row of creatorRows)
            creatorById.set(String(row.creatorId), row);
        const formattedTopCreators = rankedCreatorIds
            .map((creatorId) => {
            var _a;
            const row = creatorById.get(creatorId);
            if (!row)
                return null;
            const totals = creatorTotals.get(creatorId);
            const firstName = row["creator.user.firstName"] || "";
            const lastName = row["creator.user.lastName"] || "";
            const email = row["creator.user.email"] || "";
            return {
                id: creatorId,
                name: row["creator.displayName"] ||
                    `${firstName} ${lastName}`.trim() ||
                    email ||
                    "Unknown Creator",
                email,
                volume: Number(totals.volume.toFixed(2)),
                sales: totals.sales,
                collections: parseInt((_a = row.collections) !== null && _a !== void 0 ? _a : "0", 10) || 0
            };
        })
            .filter((creator) => creator !== null);
        const formattedRecentSales = recentSales.map(sale => {
            var _a, _b, _c, _d, _e;
            const buyerData = (_a = sale.buyer) === null || _a === void 0 ? void 0 : _a.dataValues;
            const sellerData = (_b = sale.seller) === null || _b === void 0 ? void 0 : _b.dataValues;
            return {
                id: sale.id,
                tokenName: ((_c = sale.token) === null || _c === void 0 ? void 0 : _c.name) || "Unknown",
                collectionName: ((_e = (_d = sale.token) === null || _d === void 0 ? void 0 : _d.collection) === null || _e === void 0 ? void 0 : _e.name) || "Unknown",
                price: sale.price,
                currency: sale.currency,
                buyer: (buyerData === null || buyerData === void 0 ? void 0 : buyerData.name) || "Unknown",
                seller: (sellerData === null || sellerData === void 0 ? void 0 : sellerData.name) || "Unknown",
                timestamp: sale.createdAt
            };
        });
        const totalCategoryCount = categoryChart.reduce((sum, cat) => { var _a; return sum + parseInt(((_a = cat.dataValues) === null || _a === void 0 ? void 0 : _a.value) || "0"); }, 0);
        const categoryChartData = categoryChart.map((cat) => { var _a, _b; return ({
            name: cat.name || 'Uncategorized',
            value: parseInt(((_a = cat.dataValues) === null || _a === void 0 ? void 0 : _a.value) || "0"),
            percentage: totalCategoryCount > 0 ? (parseInt(((_b = cat.dataValues) === null || _b === void 0 ? void 0 : _b.value) || "0") / totalCategoryCount) * 100 : 0
        }); }).filter((cat) => cat.value > 0);
        const overview = {
            totalCollections,
            totalTokens,
            totalListings,
            totalSales,
            totalVolume: currentVolumeUSD,
            totalUsers: parseInt(String((_o = (_a = participantRows[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _o !== void 0 ? _o : "0"), 10) || 0,
            totalActivity,
            avgPrice: avgPriceUSD
        };
        const chartData = {
            volumeChart,
            categoryChart: categoryChartData,
            chainChart
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get NFT Analytics retrieved successfully");
        return {
            overview,
            trends,
            topCollections: formattedTopCollections,
            topCreators: formattedTopCreators,
            recentSales: formattedRecentSales,
            chartData,
            unpricedCurrencies: [...unpriced]
        };
    }
    catch (error) {
        console_1.logger.error("NFT", "Error fetching NFT analytics", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch NFT marketplace analytics"
        });
    }
};
