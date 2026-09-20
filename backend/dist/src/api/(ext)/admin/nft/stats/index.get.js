"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = {
    summary: "Get NFT marketplace admin statistics",
    description: "Collection, token, listing, sale, activity and fee totals for the admin NFT overview. Every money figure is priced into USD before it is summed; currencies that could not be priced are listed in `unpriced` and make the total a lower bound.",
    operationId: "getNftAdminStats",
    tags: ["Admin", "NFT", "Analytics"],
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Stats",
    responses: {
        200: {
            description: "NFT marketplace statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            collections: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    active: { type: "number" },
                                    pending: { type: "number" },
                                    verified: { type: "number" }
                                }
                            },
                            tokens: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    minted: { type: "number" },
                                    listed: { type: "number" }
                                }
                            },
                            listings: {
                                type: "object",
                                properties: {
                                    total: { type: "number" },
                                    active: { type: "number" },
                                    auctions: { type: "number" },
                                    fixedPrice: { type: "number" }
                                }
                            },
                            sales: {
                                type: "object",
                                description: "`volume` and `avgPrice` are USD. `total` and `last24h` are row counts and carry no currency.",
                                properties: {
                                    total: { type: "number" },
                                    volume: { type: "number" },
                                    avgPrice: {
                                        type: "number",
                                        nullable: true,
                                        description: "Null when no sale could be priced — an average of nothing is not zero."
                                    },
                                    last24h: { type: "number" },
                                    currency: { type: "string" },
                                    unpriced: { type: "array", items: { type: "string" } }
                                }
                            },
                            activity: {
                                type: "object",
                                properties: {
                                    totalTransactions: { type: "number" },
                                    last24h: { type: "number" },
                                    uniqueUsers: {
                                        type: "number",
                                        description: "Distinct users on EITHER side of an activity row, de-duplicated."
                                    },
                                    topCollection: {
                                        type: "string",
                                        nullable: true,
                                        description: "Ranked by USD-priced volume over all completed sales. Null when nothing has traded, or when nothing that traded could be priced."
                                    }
                                }
                            },
                            revenue: {
                                type: "object",
                                description: "All figures USD; see `unpriced`.",
                                properties: {
                                    totalFees: { type: "number" },
                                    marketplaceFees: { type: "number" },
                                    royaltyFees: { type: "number" },
                                    last30Days: { type: "number" },
                                    currency: { type: "string" },
                                    unpriced: { type: "array", items: { type: "string" } }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: { description: "Internal Server Error" }
    },
    requiresAuth: true,
    permission: "access.nft"
};
const priced = (rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0;
function priceBucket(byCurrency, rates) {
    let total = 0;
    const unpriced = new Set();
    for (const [currency, amount] of byCurrency) {
        if (!Number.isFinite(amount) || amount === 0)
            continue;
        const rate = rates.get(currency);
        if (!priced(rate)) {
            unpriced.add(currency || "UNKNOWN");
            continue;
        }
        total += amount * rate;
    }
    return { total, unpriced };
}
function accumulate(bucket, currency, amount) {
    var _a;
    const code = String(currency !== null && currency !== void 0 ? currency : "");
    const value = parseFloat(String(amount !== null && amount !== void 0 ? amount : "0")) || 0;
    bucket.set(code, ((_a = bucket.get(code)) !== null && _a !== void 0 ? _a : 0) + value);
}
const round = (value) => Number(value.toFixed(2));
exports.default = async (data) => {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h;
    const { ctx } = data;
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Counting marketplace totals");
        const [totalCollections, activeCollections, pendingCollections, verifiedCollections, totalTokens, mintedTokens, listedTokens, totalListings, activeListings, auctionListings, fixedPriceListings, salesRows, sales24h, totalActivity, activity24h, uniqueUserResults, collectionVolumeRows, revenueRows, revenue30DaysRows] = await Promise.all([
            db_1.models.nftCollection.count(),
            db_1.models.nftCollection.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftCollection.count({ where: { status: "PENDING" } }),
            db_1.models.nftCollection.count({ where: { isVerified: true } }),
            db_1.models.nftToken.count(),
            db_1.models.nftToken.count({ where: { isMinted: true } }),
            db_1.models.nftToken.count({ where: { isListed: true } }),
            db_1.models.nftListing.count(),
            db_1.models.nftListing.count({ where: { status: "ACTIVE" } }),
            db_1.models.nftListing.count({ where: { type: "AUCTION", status: "ACTIVE" } }),
            db_1.models.nftListing.count({ where: { type: "FIXED_PRICE", status: "ACTIVE" } }),
            db_1.models.nftSale.findAll({
                attributes: [
                    'currency',
                    [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.literal)('*')), 'totalSales'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('price')), 'totalVolume']
                ],
                where: { status: "COMPLETED" },
                group: ['currency'],
                raw: true
            }),
            db_1.models.nftSale.count({
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.gte]: last24h }
                }
            }),
            db_1.models.nftActivity.count(),
            db_1.models.nftActivity.count({
                where: { createdAt: { [sequelize_1.Op.gte]: last24h } }
            }),
            db_1.sequelize.query(`SELECT COUNT(*) AS count FROM (
            SELECT fromUserId AS userId FROM nft_activity
             WHERE deletedAt IS NULL AND fromUserId IS NOT NULL
            UNION
            SELECT toUserId AS userId FROM nft_activity
             WHERE deletedAt IS NULL AND toUserId IS NOT NULL
         ) AS participants`, { type: sequelize_1.QueryTypes.SELECT }),
            db_1.models.nftSale.findAll({
                attributes: [
                    [(0, sequelize_1.col)('token.collection.id'), 'collectionId'],
                    [(0, sequelize_1.col)('token.collection.name'), 'collectionName'],
                    [(0, sequelize_1.col)('nftSale.currency'), 'currency'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('nftSale.price')), 'volume']
                ],
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: 'token',
                        attributes: [],
                        include: [
                            {
                                model: db_1.models.nftCollection,
                                as: 'collection',
                                attributes: []
                            }
                        ]
                    }
                ],
                where: { status: "COMPLETED" },
                group: [
                    (0, sequelize_1.col)('token.collection.id'),
                    (0, sequelize_1.col)('token.collection.name'),
                    (0, sequelize_1.col)('nftSale.currency')
                ],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    'currency',
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('marketplaceFee')), 'marketplaceFees'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('royaltyFee')), 'royaltyFees'],
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('totalFee')), 'totalFees']
                ],
                where: { status: "COMPLETED" },
                group: ['currency'],
                raw: true
            }),
            db_1.models.nftSale.findAll({
                attributes: [
                    'currency',
                    [(0, sequelize_1.fn)('SUM', (0, sequelize_1.col)('totalFee')), 'totalFees']
                ],
                where: {
                    status: "COMPLETED",
                    createdAt: { [sequelize_1.Op.gte]: last30Days }
                },
                group: ['currency'],
                raw: true
            })
        ]);
        const salesVolumeByCurrency = new Map();
        const salesCountByCurrency = new Map();
        let totalSalesCount = 0;
        for (const row of salesRows) {
            const code = String((_b = row.currency) !== null && _b !== void 0 ? _b : "");
            const count = parseInt(String((_c = row.totalSales) !== null && _c !== void 0 ? _c : "0"), 10) || 0;
            totalSalesCount += count;
            salesCountByCurrency.set(code, ((_d = salesCountByCurrency.get(code)) !== null && _d !== void 0 ? _d : 0) + count);
            accumulate(salesVolumeByCurrency, code, row.totalVolume);
        }
        const marketplaceFeeByCurrency = new Map();
        const royaltyFeeByCurrency = new Map();
        const totalFeeByCurrency = new Map();
        for (const row of revenueRows) {
            accumulate(marketplaceFeeByCurrency, row.currency, row.marketplaceFees);
            accumulate(royaltyFeeByCurrency, row.currency, row.royaltyFees);
            accumulate(totalFeeByCurrency, row.currency, row.totalFees);
        }
        const fees30DaysByCurrency = new Map();
        for (const row of revenue30DaysRows) {
            accumulate(fees30DaysByCurrency, row.currency, row.totalFees);
        }
        const currencies = new Set();
        for (const bucket of [
            salesVolumeByCurrency,
            marketplaceFeeByCurrency,
            royaltyFeeByCurrency,
            totalFeeByCurrency,
            fees30DaysByCurrency
        ]) {
            for (const code of bucket.keys())
                if (code)
                    currencies.add(code);
        }
        for (const row of collectionVolumeRows) {
            if (row.currency)
                currencies.add(String(row.currency));
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Pricing marketplace volume into USD");
        const rates = await (0, utils_1.getUsdRates)([...currencies]);
        const salesPriced = priceBucket(salesVolumeByCurrency, rates);
        const salesUnpriced = salesPriced.unpriced;
        let pricedSalesCount = 0;
        for (const [code, count] of salesCountByCurrency) {
            if (priced(rates.get(code)))
                pricedSalesCount += count;
        }
        const avgPrice = pricedSalesCount > 0 ? round(salesPriced.total / pricedSalesCount) : null;
        const collectionTotals = new Map();
        for (const row of collectionVolumeRows) {
            const id = row.collectionId ? String(row.collectionId) : null;
            const name = row.collectionName ? String(row.collectionName) : null;
            if (!id || !name)
                continue;
            const amount = parseFloat(String((_e = row.volume) !== null && _e !== void 0 ? _e : "0")) || 0;
            if (amount === 0)
                continue;
            const rate = rates.get(String((_f = row.currency) !== null && _f !== void 0 ? _f : ""));
            if (!priced(rate)) {
                salesUnpriced.add(String(row.currency || "UNKNOWN"));
                continue;
            }
            const entry = (_g = collectionTotals.get(id)) !== null && _g !== void 0 ? _g : { name, total: 0 };
            entry.total += amount * rate;
            collectionTotals.set(id, entry);
        }
        let topCollection = null;
        let topCollectionVolume = 0;
        for (const entry of collectionTotals.values()) {
            if (entry.total > topCollectionVolume) {
                topCollectionVolume = entry.total;
                topCollection = entry.name;
            }
        }
        const marketplacePriced = priceBucket(marketplaceFeeByCurrency, rates);
        const royaltyPriced = priceBucket(royaltyFeeByCurrency, rates);
        const totalFeePriced = priceBucket(totalFeeByCurrency, rates);
        const fees30DaysPriced = priceBucket(fees30DaysByCurrency, rates);
        const revenueUnpriced = new Set([
            ...marketplacePriced.unpriced,
            ...royaltyPriced.unpriced,
            ...totalFeePriced.unpriced,
            ...fees30DaysPriced.unpriced
        ]);
        const uniqueUsers = parseInt(String((_h = (_a = uniqueUserResults[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _h !== void 0 ? _h : "0"), 10) || 0;
        const stats = {
            collections: {
                total: totalCollections,
                active: activeCollections,
                pending: pendingCollections,
                verified: verifiedCollections
            },
            tokens: {
                total: totalTokens,
                minted: mintedTokens,
                listed: listedTokens
            },
            listings: {
                total: totalListings,
                active: activeListings,
                auctions: auctionListings,
                fixedPrice: fixedPriceListings
            },
            sales: {
                total: totalSalesCount,
                volume: round(salesPriced.total),
                avgPrice,
                last24h: sales24h,
                currency: "USD",
                unpriced: [...salesUnpriced]
            },
            activity: {
                totalTransactions: totalActivity,
                last24h: activity24h,
                uniqueUsers,
                topCollection
            },
            revenue: {
                totalFees: round(totalFeePriced.total),
                marketplaceFees: round(marketplacePriced.total),
                royaltyFees: round(royaltyPriced.total),
                last30Days: round(fees30DaysPriced.total),
                currency: "USD",
                unpriced: [...revenueUnpriced]
            }
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success("NFT marketplace statistics retrieved successfully");
        return stats;
    }
    catch (error) {
        console.error("Error fetching NFT admin stats:", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to fetch NFT marketplace statistics"
        });
    }
};
