"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeDexLiquidityReadiness = describeDexLiquidityReadiness;
function describeDexLiquidityReadiness(facts) {
    const meetsMinLiquidity = facts.liquidityUsd !== null && facts.liquidityUsd >= facts.minLiquidityUsd;
    const gotchas = [];
    gotchas.push({
        level: "danger",
        title: "You are about to become the counterparty",
        body: "Liquidity you provide here is traded against by your own users. You take the price risk; they take the execution risk.",
    });
    if (!facts.feeBookable) {
        gotchas.push({
            level: "danger",
            title: "Fees from this pool cannot be booked",
            body: "They are mixed into your principal on chain with no event separating them, so they will never appear in your profit report. " +
                "Seed a V3-style pool if you need bookable revenue.",
        });
    }
    if (!facts.quoteAssetRegistered) {
        gotchas.push({
            level: "danger",
            title: `${facts.quoteAssetSymbol} is not in your currency list`,
            body: "Fees collected from this pool cannot be swept — the sweep refuses by name rather than creating a wallet in a currency nothing can spend.",
        });
    }
    if (facts.operatorIssuedToken) {
        gotchas.push({
            level: "danger",
            title: "You issued this token",
            body: "Issuer, market maker and interface operator in one entity, on a token whose supply that entity can increase. " +
                "That configuration should be reached deliberately, not by ticking three unrelated switches on three pages.",
        });
    }
    if (!meetsMinLiquidity) {
        gotchas.push({
            level: "warning",
            title: "This pool is below your minimum",
            body: facts.liquidityUsd === null
                ? "Its reserves cannot be priced, so its depth cannot be checked at all. It will not be quotable."
                : `It holds about $${Math.round(facts.liquidityUsd).toLocaleString("en-US")} against a $${facts.minLiquidityUsd.toLocaleString("en-US")} floor. ` +
                    "It will not be quotable, and trades against it would be sandwiched or would fail.",
        });
    }
    if (facts.operatorShareBps !== null &&
        facts.operatorShareBps > facts.operatorShareWarnBps) {
        gotchas.push({
            level: "warning",
            title: "You are the majority of this pool's liquidity",
            body: "Most trades here have you as the counterparty.",
        });
    }
    if (!facts.independentPriceAvailable) {
        gotchas.push({
            level: "info",
            title: "No independent price exists for this token",
            body: "Every value shown for this position is derived from your own pool. It is not a market price, and it is not a valuation.",
        });
    }
    if (!facts.geoAdminBypass) {
        gotchas.push({
            level: "warning",
            title: "Admin geo bypass is off",
            body: "If a geo rule covers your own country you will be unable to seed, add to, or withdraw this liquidity. " +
                "The geo console itself stays reachable, so that is where you would fix it.",
        });
    }
    gotchas.push({
        level: "info",
        title: "A liquidity position is not revenue",
        body: "It is capital at risk whose value changes with price. Only V3 fee collections are booked to your profit report; everything else on this page is unrealised.",
    });
    let blockingReason = null;
    if (!facts.factoryAllowlisted) {
        blockingReason =
            "This pool's factory is not an AMM deployment this platform quotes from. Add it under Admin → Swap → Chains once you have verified it against the vendor's published list.";
    }
    else if (!facts.poolVerified) {
        blockingReason =
            "This pool has not been verified against its factory yet. Run Verify before seeding it.";
    }
    else if (!meetsMinLiquidity) {
        blockingReason =
            facts.liquidityUsd === null
                ? "This pool's reserves cannot be priced, so its depth cannot be checked against your minimum."
                : `This pool is below the $${facts.minLiquidityUsd.toLocaleString("en-US")} minimum liquidity for a direct route.`;
    }
    const verdict = blockingReason
        ? "BLOCKED"
        : facts.acknowledgementValid
            ? "READY"
            : "ACKNOWLEDGEMENT_REQUIRED";
    return {
        ...facts,
        meetsMinLiquidity,
        verdict,
        blockingReason,
        gotchas,
    };
}
