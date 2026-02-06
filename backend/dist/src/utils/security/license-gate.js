"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLicenseGate = createLicenseGate;
exports.createLicenseCheck = createLicenseCheck;
exports.createStrictLicenseGate = createStrictLicenseGate;
exports.createFeatureGate = createFeatureGate;
exports.getLicenseGate = getLicenseGate;
exports.checkLicense = checkLicense;
exports.revalidateLicense = revalidateLicense;

function createLicenseGate(productId, options = {}) {
    // Return a dummy object/function that mimics the original gate but allows everything
    const gate = async function (req, res, next) {
        if (next) return next();
        return true;
    };
    gate.check = async () => ({ success: true, valid: true });
    return gate;
}

function createLicenseCheck(productId) {
    return createLicenseGate(productId);
}

function createStrictLicenseGate(productId) {
    return createLicenseGate(productId);
}

function createFeatureGate(productId, features) {
    return createLicenseGate(productId);
}

const productGates = new Map();

function getLicenseGate(productId) {
    if (!productGates.has(productId)) {
        productGates.set(productId, createLicenseGate(productId));
    }
    return productGates.get(productId);
}

async function checkLicense(productId) {
    return { success: true, valid: true };
}

async function revalidateLicense(productId) {
    return { success: true, valid: true };
}