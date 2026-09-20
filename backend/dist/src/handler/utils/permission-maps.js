"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GATEWAY_PERMISSION_MAP = exports.SCOPED_MONEY_PREFIXES = exports.PERMISSION_MAP = void 0;
exports.isScopedMoneyRoute = isScopedMoneyRoute;
exports.findPermissionForRoute = findPermissionForRoute;
exports.hasRoutePermission = hasRoutePermission;
exports.PERMISSION_MAP = {
    trade: [
        "/api/exchange/order",
        "/api/ecosystem/order",
        "/api/exchange/binary/order",
        "/api/forex-trading/order",
        "/api/dex/swap",
    ],
    futures: ["/api/futures"],
    deposit: ["/api/finance/deposit"],
    withdraw: [
        "/api/finance/withdraw",
        "/api/ecosystem/withdraw",
        "/api/staking/position/:id/withdraw",
        "/api/forex/account/:id/withdraw",
        "/api/forex-trading/account/:id/withdraw",
        "/api/nft/marketplace/withdraw",
    ],
    transfer: [
        "/api/finance/transfer",
        "/api/nft/token/:id/transfer",
        "/api/ecosystem/wallet/:id/transfer",
        "/api/p2p/trade/:id/release",
        "/api/copy-trading/follower/:id/allocation/:allocationId/remove-funds",
        "/api/ico/creator/token/:id/release/:transactionId",
    ],
};
exports.SCOPED_MONEY_PREFIXES = [
    "/api/finance/withdraw",
    "/api/finance/transfer",
    "/api/finance/deposit",
    "/api/exchange/order",
    "/api/exchange/binary/order",
    "/api/ecosystem/order",
    "/api/futures/order",
    "/api/forex-trading/order",
    "/api/dex/swap",
    "/api/ecosystem/withdraw",
    "/api/ecosystem/wallet/:id/transfer",
    "/api/staking/position/:id/withdraw",
    "/api/nft/token/:id/transfer",
    "/api/nft/marketplace/withdraw",
    "/api/forex/account/:id/withdraw",
    "/api/forex-trading/account/:id/withdraw",
    "/api/p2p/trade/:id/release",
    "/api/copy-trading/follower/:id/allocation/:allocationId/remove-funds",
    "/api/ico/creator/token/:id/release/:transactionId",
];
function isScopedMoneyRoute(routePath) {
    return exports.SCOPED_MONEY_PREFIXES.some((prefix) => routePath.startsWith(prefix));
}
exports.GATEWAY_PERMISSION_MAP = {
    "gateway.payment.create": ["/api/gateway/v1/payment/create"],
    "gateway.payment.status": ["/api/gateway/v1/payment"],
    "gateway.refund.create": ["/api/gateway/v1/refund"],
};
function findPermissionForRoute(routePath, permissionMap) {
    for (const [permission, routes] of Object.entries(permissionMap)) {
        if (routes.some((route) => routePath.startsWith(route))) {
            return permission;
        }
    }
    return null;
}
function hasRoutePermission(routePath, userPermissions, permissionMap) {
    const requiredPermission = findPermissionForRoute(routePath, permissionMap);
    if (!requiredPermission) {
        return false;
    }
    return userPermissions.includes(requiredPermission);
}
