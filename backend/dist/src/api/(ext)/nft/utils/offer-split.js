"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitOfferEscrow = splitOfferEscrow;
function nonNegative(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
function splitOfferEscrow(input) {
    const amount = nonNegative(input.amount, 0);
    const currentFeePercent = nonNegative(input.currentFeePercent, 0);
    const royaltyPercent = nonNegative(input.royaltyPercent, 0);
    const held = input.heldAmount === null || input.heldAmount === undefined
        ? null
        : Number(input.heldAmount);
    const buyerPaid = held !== null && Number.isFinite(held) && held >= 0
        ? held
        : amount + amount * (currentFeePercent / 100);
    const marketplaceFee = Math.max(0, buyerPaid - amount);
    const sellerGross = buyerPaid - marketplaceFee;
    const royalty = sellerGross * (royaltyPercent / 100);
    const sellerReceives = sellerGross - royalty;
    return {
        buyerPaid,
        marketplaceFee,
        royalty,
        sellerReceives,
        feePercent: amount > 0 ? (marketplaceFee / amount) * 100 : currentFeePercent,
    };
}
