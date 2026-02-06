'use strict';

// License routes - All routes exempt (license bypassed)

Object.defineProperty(exports, '__esModule', { value: true });

// All routes are now exempt from license checking
exports.LICENSE_EXEMPT_ROUTES = ['/']; // Root matches all

exports.EXTENSION_LICENSE_MAP = [];

exports.BLOCKCHAIN_ROUTE_PATTERN = /never-match-anything/;

exports.KNOWN_BLOCKCHAIN_CHAINS = [];

exports.EXCHANGE_ROUTES = [];

// All routes are exempt
function isLicenseExemptRoute(route) {
    return true;
}
exports.isLicenseExemptRoute = isLicenseExemptRoute;

function findExtensionForRoute(route) {
    return null;
}
exports.findExtensionForRoute = findExtensionForRoute;

function findBlockchainForRoute(route) {
    return null;
}
exports.findBlockchainForRoute = findBlockchainForRoute;

function isExchangeRoute(route) {
    return false;
}
exports.isExchangeRoute = isExchangeRoute;
