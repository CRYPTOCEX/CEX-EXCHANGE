"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftMarketHandler = exports.metadata = void 0;
const console_1 = require("@b/utils/console");
const Websocket_1 = require("@b/handler/Websocket");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {};
class NFTMarketDataHandler {
    constructor() {
        this.activeSubscriptions = new Map();
        this.auctionTimers = new Map();
        this.updateInterval = null;
        this.startPeriodicUpdates();
    }
    static getInstance() {
        if (!NFTMarketDataHandler.instance) {
            NFTMarketDataHandler.instance = new NFTMarketDataHandler();
        }
        return NFTMarketDataHandler.instance;
    }
    startPeriodicUpdates() {
        if (this.updateInterval)
            return;
        this.updateInterval = setInterval(async () => {
            await this.broadcastActiveAuctions();
            await this.broadcastRecentActivity();
        }, 5000);
    }
    async addSubscription(message) {
        try {
            if (typeof message === "string") {
                message = JSON.parse(message);
            }
            const { type, tokenId, collectionId, userId, auctionId } = message.payload;
            if (!type) {
                console_1.logger.warn("NFT_MARKET", "No subscription type provided");
                return;
            }
            const subscriptionKey = this.getSubscriptionKey(type, { tokenId, collectionId, userId, auctionId });
            if (!this.activeSubscriptions.has(subscriptionKey)) {
                this.activeSubscriptions.set(subscriptionKey, new Set());
            }
            switch (type) {
                case "auction":
                    await this.handleAuctionSubscription(tokenId, auctionId);
                    break;
                case "token":
                    await this.handleTokenSubscription(tokenId);
                    break;
                case "collection":
                    await this.handleCollectionSubscription(collectionId);
                    break;
                case "activity":
                    await this.handleActivitySubscription(userId);
                    break;
                case "bids":
                    await this.handleBidsSubscription(tokenId, auctionId);
                    break;
                default:
                    console_1.logger.warn("NFT_MARKET", `Unknown subscription type: ${type}`);
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to handle NFT market subscription", error);
        }
    }
    getSubscriptionKey(type, params) {
        const { tokenId, collectionId, userId, auctionId } = params;
        switch (type) {
            case "auction":
                return `auction:${auctionId || tokenId}`;
            case "token":
                return `token:${tokenId}`;
            case "collection":
                return `collection:${collectionId}`;
            case "activity":
                return `activity:${userId || "global"}`;
            case "bids":
                return `bids:${auctionId || tokenId}`;
            default:
                return `${type}:${tokenId || collectionId || userId || "global"}`;
        }
    }
    async handleAuctionSubscription(tokenId, auctionId) {
        var _a;
        try {
            const whereClause = { status: "ACTIVE", type: "AUCTION" };
            if (auctionId) {
                whereClause.id = auctionId;
            }
            else if (tokenId) {
                whereClause.tokenId = tokenId;
            }
            const auction = await db_1.models.nftListing.findOne({
                where: whereClause,
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: ["id", "name", "image"],
                    },
                    {
                        model: db_1.models.nftBid,
                        as: "bids",
                        limit: 1,
                        order: [["amount", "DESC"]],
                        include: [
                            {
                                model: db_1.models.user,
                                as: "bidder",
                                attributes: ["id", "firstName", "lastName", "avatar"],
                            },
                        ],
                    },
                ],
            });
            if (auction) {
                const timeLeft = auction.endTime ? new Date(auction.endTime).getTime() - Date.now() : 0;
                const auctionData = {
                    id: auction.id,
                    tokenId: auction.tokenId,
                    price: auction.price,
                    reservePrice: auction.reservePrice,
                    buyNowPrice: auction.buyNowPrice,
                    endTime: auction.endTime,
                    timeLeft: Math.max(0, timeLeft),
                    highestBid: ((_a = auction.bids) === null || _a === void 0 ? void 0 : _a[0]) || null,
                    token: auction.token,
                };
                this.broadcastToSubscribers(`auction:${auction.id}`, {
                    type: "auction_update",
                    data: auctionData,
                });
                if (auction.endTime && timeLeft > 0 && !this.auctionTimers.has(auction.id)) {
                    this.setupAuctionTimer(auction.id, auction.endTime);
                }
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to handle auction subscription", error);
        }
    }
    async handleTokenSubscription(tokenId) {
        var _a;
        try {
            const token = await db_1.models.nftToken.findByPk(tokenId, {
                include: [
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name", "floorPrice"],
                    },
                    {
                        model: db_1.models.nftListing,
                        as: "listings",
                        where: { status: "ACTIVE" },
                        required: false,
                        order: [["price", "ASC"]],
                    },
                ],
            });
            if (token) {
                this.broadcastToSubscribers(`token:${tokenId}`, {
                    type: "token_update",
                    data: {
                        id: token.id,
                        name: token.name,
                        image: token.image,
                        collection: token.collection,
                        currentListing: ((_a = token.listings) === null || _a === void 0 ? void 0 : _a[0]) || null,
                        views: token.views,
                        likes: token.likes,
                    },
                });
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to handle token subscription", error);
        }
    }
    async handleCollectionSubscription(collectionId) {
        try {
            const collection = await db_1.models.nftCollection.findByPk(collectionId, {
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "tokens",
                        limit: 12,
                        order: [["createdAt", "DESC"]],
                        where: { status: "ACTIVE" },
                        include: [
                            {
                                model: db_1.models.nftListing,
                                as: "listings",
                                where: { status: "ACTIVE" },
                                required: false,
                                order: [["price", "ASC"]],
                                limit: 1,
                            },
                        ],
                    },
                ],
            });
            if (collection) {
                const stats = await this.getCollectionStats(collectionId);
                this.broadcastToSubscribers(`collection:${collectionId}`, {
                    type: "collection_update",
                    data: {
                        id: collection.id,
                        name: collection.name,
                        logoImage: collection.logoImage,
                        isVerified: collection.isVerified,
                        stats,
                    },
                });
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to handle collection subscription", error);
        }
    }
    async handleActivitySubscription(userId) {
        try {
            const whereClause = {};
            if (userId) {
                whereClause[sequelize_1.Op.or] = [
                    { fromUserId: userId },
                    { toUserId: userId },
                ];
            }
            const activities = await db_1.models.nftActivity.findAll({
                where: whereClause,
                limit: 20,
                order: [["createdAt", "DESC"]],
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: ["id", "name", "image"],
                    },
                    {
                        model: db_1.models.nftCollection,
                        as: "collection",
                        attributes: ["id", "name"],
                    },
                    {
                        model: db_1.models.user,
                        as: "fromUser",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                    {
                        model: db_1.models.user,
                        as: "toUser",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            });
            const subscriptionKey = userId ? `activity:${userId}` : "activity:global";
            this.broadcastToSubscribers(subscriptionKey, {
                type: "activity_update",
                data: activities,
            });
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to handle activity subscription", error);
        }
    }
    async handleBidsSubscription(tokenId, auctionId) {
        try {
            const whereClause = {};
            if (auctionId) {
                whereClause.listingId = auctionId;
            }
            else if (tokenId) {
                const listing = await db_1.models.nftListing.findOne({
                    where: { tokenId, status: "ACTIVE", type: "AUCTION" },
                });
                if (listing) {
                    whereClause.listingId = listing.id;
                }
            }
            const bids = await db_1.models.nftBid.findAll({
                where: { ...whereClause, status: "ACTIVE" },
                order: [["amount", "DESC"]],
                limit: 10,
                include: [
                    {
                        model: db_1.models.user,
                        as: "bidder",
                        attributes: ["id", "firstName", "lastName", "avatar"],
                    },
                ],
            });
            const subscriptionKey = auctionId ? `bids:${auctionId}` : `bids:${tokenId}`;
            this.broadcastToSubscribers(subscriptionKey, {
                type: "bids_update",
                data: bids,
            });
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to handle bids subscription", error);
        }
    }
    async broadcastActiveAuctions() {
        try {
            if (!(0, Websocket_1.hasClients)("/api/nft/market"))
                return;
            const activeAuctions = await db_1.models.nftListing.findAll({
                where: {
                    status: "ACTIVE",
                    type: "AUCTION",
                    endTime: { [sequelize_1.Op.gt]: new Date() },
                },
                include: [
                    {
                        model: db_1.models.nftToken,
                        as: "token",
                        attributes: ["id", "name", "image"],
                    },
                    {
                        model: db_1.models.nftBid,
                        as: "bids",
                        limit: 1,
                        order: [["amount", "DESC"]],
                    },
                ],
                order: [["endTime", "ASC"]],
                limit: 20,
            });
            for (const auction of activeAuctions) {
                const timeLeft = new Date(auction.endTime).getTime() - Date.now();
                if (timeLeft > 0) {
                    await this.handleAuctionSubscription(auction.tokenId, auction.id);
                }
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to broadcast active auctions", error);
        }
    }
    async broadcastRecentActivity() {
        try {
            if (!(0, Websocket_1.hasClients)("/api/nft/market"))
                return;
            await this.handleActivitySubscription();
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to broadcast recent activity", error);
        }
    }
    setupAuctionTimer(auctionId, endTime) {
        const timeLeft = new Date(endTime).getTime() - Date.now();
        if (timeLeft <= 0)
            return;
        const timer = setTimeout(async () => {
            try {
                await this.finalizeAuction(auctionId);
                this.auctionTimers.delete(auctionId);
            }
            catch (error) {
                console_1.logger.error("NFT", "Failed to finalize auction timer", error);
            }
        }, timeLeft);
        this.auctionTimers.set(auctionId, timer);
    }
    async finalizeAuction(auctionId) {
        var _a;
        try {
            const auction = await db_1.models.nftListing.findByPk(auctionId, {
                include: [
                    {
                        model: db_1.models.nftBid,
                        as: "bids",
                        limit: 1,
                        order: [["amount", "DESC"]],
                        where: { status: "ACTIVE" },
                    },
                ],
            });
            if (!auction)
                return;
            const highestBid = (_a = auction.bids) === null || _a === void 0 ? void 0 : _a[0];
            if (highestBid && (!auction.reservePrice || highestBid.amount >= auction.reservePrice)) {
                await db_1.models.nftBid.update({ status: "ACCEPTED" }, { where: { id: highestBid.id } });
                await auction.update({ status: "SOLD" });
                await db_1.models.nftSale.create({
                    tokenId: auction.tokenId,
                    listingId: auction.id,
                    sellerId: auction.sellerId,
                    buyerId: highestBid.bidderId,
                    price: highestBid.amount,
                    currency: highestBid.currency,
                    marketplaceFee: highestBid.amount * 0.025,
                    royaltyFee: 0,
                    totalFee: highestBid.amount * 0.025,
                    netAmount: highestBid.amount * 0.975,
                    status: "COMPLETED",
                });
                this.broadcastToSubscribers(`auction:${auctionId}`, {
                    type: "auction_ended",
                    data: {
                        auctionId,
                        winner: highestBid.bidderId,
                        winningBid: highestBid.amount,
                        status: "sold",
                    },
                });
            }
            else {
                await auction.update({ status: "EXPIRED" });
                this.broadcastToSubscribers(`auction:${auctionId}`, {
                    type: "auction_ended",
                    data: {
                        auctionId,
                        status: "expired",
                        reason: highestBid ? "reserve_not_met" : "no_bids",
                    },
                });
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to finalize auction", error);
        }
    }
    async getCollectionStats(collectionId) {
        try {
            const tokenIds = await db_1.models.nftToken.findAll({
                where: { collectionId, status: "ACTIVE" },
                attributes: ["id"],
                raw: true,
            });
            const tokenIdList = tokenIds.map((t) => t.id);
            const [totalItems, floorPrice, totalVolume] = await Promise.all([
                db_1.models.nftToken.count({ where: { collectionId, status: "ACTIVE" } }),
                tokenIdList.length > 0
                    ? db_1.models.nftListing.min("price", {
                        where: {
                            tokenId: tokenIdList,
                            status: "ACTIVE",
                            type: "FIXED_PRICE"
                        }
                    })
                    : 0,
                tokenIdList.length > 0
                    ? db_1.models.nftSale.sum("price", { where: { tokenId: tokenIdList } })
                    : 0,
            ]);
            return {
                totalItems,
                floorPrice: floorPrice || 0,
                totalVolume: totalVolume || 0,
            };
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to get collection stats", error);
            return { totalItems: 0, floorPrice: 0, totalVolume: 0 };
        }
    }
    broadcastToSubscribers(subscriptionKey, message) {
        const route = "/api/nft/market";
        Websocket_1.messageBroker.broadcastToSubscribedClients(route, { subscription: subscriptionKey }, {
            stream: subscriptionKey,
            data: message,
        });
    }
    async broadcastUpdate(type, data) {
        try {
            switch (type) {
                case "new_bid":
                    await this.handleBidsSubscription(data.tokenId, data.listingId);
                    await this.handleAuctionSubscription(data.tokenId, data.listingId);
                    break;
                case "new_sale":
                    await this.handleTokenSubscription(data.tokenId);
                    await this.handleCollectionSubscription(data.collectionId);
                    break;
                case "new_listing":
                    await this.handleTokenSubscription(data.tokenId);
                    break;
            }
        }
        catch (error) {
            console_1.logger.error("NFT", "Failed to broadcast update", error);
        }
    }
}
exports.default = async (data, message) => {
    try {
        let parsedMessage;
        if (typeof message === "string") {
            try {
                parsedMessage = JSON.parse(message);
            }
            catch (error) {
                console_1.logger.error("NFT", "Invalid JSON message received", error);
                return;
            }
        }
        else {
            parsedMessage = message;
        }
        if (!parsedMessage || !parsedMessage.payload) {
            console_1.logger.error("NFT", "Invalid message structure: payload is missing", new Error("Missing payload"));
            return;
        }
        const { type } = parsedMessage.payload;
        if (!type) {
            console_1.logger.error("NFT", "Invalid message structure: type is missing", new Error("Missing type field"));
            return;
        }
        const handler = NFTMarketDataHandler.getInstance();
        await handler.addSubscription(parsedMessage);
    }
    catch (error) {
        console_1.logger.error("NFT", "Failed to handle NFT market WebSocket message", error);
    }
};
exports.nftMarketHandler = NFTMarketDataHandler.getInstance();
