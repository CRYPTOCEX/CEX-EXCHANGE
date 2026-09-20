"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNROUTABLE = void 0;
exports.resolveDeepLink = resolveDeepLink;
exports.routedTitles = routedTitles;
function normalise(title) {
    return String(title || "").trim().toLowerCase().replace(/\s+/g, " ");
}
const TABLE = {
    "deposit confirmation": {
        module: "wallet",
        screen: "/wallet/transaction/:id",
        usesId: true,
        relatedIdIs: "transaction.id",
    },
    "deposit confirmed": {
        module: "wallet",
        screen: "/wallet/transaction/:id",
        usesId: true,
        relatedIdIs: "transaction.id",
    },
    "withdrawal failed": {
        module: "wallet",
        screen: "/wallet/transaction/:id",
        usesId: true,
        relatedIdIs: "transaction.id",
    },
    "withdrawal under review": {
        module: "wallet",
        screen: "/wallet/transaction/:id",
        usesId: true,
        relatedIdIs: "transaction.id",
    },
    "transfer received": {
        module: "wallet",
        screen: "/wallet",
        usesId: false,
        relatedIdIs: null,
    },
    "new p2p trade request": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "payment confirmed": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "trade completed": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "trade cancelled": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "trade expired": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "trade disputed": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "new message in p2p trade": {
        module: "p2p",
        screen: "/p2p/trade/:id",
        usesId: true,
        relatedIdIs: "p2pTrade.id",
    },
    "general investment completed": {
        module: "investment",
        screen: "/investment/:id",
        usesId: true,
        relatedIdIs: "investment.id",
    },
    "staking rewards claimed": {
        module: "staking",
        screen: "/staking/position/:id",
        usesId: true,
        relatedIdIs: "stakingPosition.id",
    },
    "staking reward credited": {
        module: "staking",
        screen: "/staking/position/:id",
        usesId: true,
        relatedIdIs: "stakingPosition.id",
    },
    "staking withdrawal completed": {
        module: "staking",
        screen: "/staking/position/:id",
        usesId: true,
        relatedIdIs: "stakingPosition.id",
    },
    "early staking withdrawal requested": {
        module: "staking",
        screen: "/staking/position/:id",
        usesId: true,
        relatedIdIs: "stakingPosition.id",
    },
    "new ico offering": {
        module: "ico",
        screen: "/ico/offer/:id",
        usesId: true,
        relatedIdIs: "offering.id",
    },
    "order confirmed": {
        module: "ecommerce",
        screen: "/ecommerce/orders/:id",
        usesId: true,
        relatedIdIs: "ecommerceOrder.id",
    },
    "new nft offer": {
        module: "nft",
        screen: "/nft/offer/:id",
        usesId: true,
        relatedIdIs: "nftOffer.id",
    },
    "referral reward earned": {
        module: "mlm",
        screen: "/mlm/rewards",
        usesId: false,
        relatedIdIs: null,
    },
};
exports.UNROUTABLE = {
    "deposit successful": "dLocal fiat webhook passes no relatedId; the transaction id is in scope but never attached.",
    "deposit failed": "As above — no relatedId on any dLocal webhook notification.",
    "deposit refunded": "As above. Title is also dynamic, so two strings describe one event.",
    "offer update": "Four distinct admin actions (activated/paused/disabled/flagged) collapse into this one title in notifyOfferEvent's default branch, so the title cannot identify the event.",
};
function resolveDeepLink(row) {
    const entry = TABLE[normalise(row.title || "")];
    if (!entry)
        return null;
    if (entry.usesId && !row.relatedId) {
        const listPath = entry.screen.replace(/\/:id.*$/, "");
        return { module: entry.module, screen: listPath, usesId: false, path: listPath };
    }
    const path = entry.usesId
        ? entry.screen.replace(":id", String(row.relatedId))
        : entry.screen;
    return { module: entry.module, screen: entry.screen, usesId: entry.usesId, path };
}
function routedTitles() {
    return Object.keys(TABLE).sort();
}
