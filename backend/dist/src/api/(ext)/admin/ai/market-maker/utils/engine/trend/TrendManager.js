"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendManager = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const PHASE_CONFIGS = {
    ACCUMULATION: {
        durationRange: { min: 24, max: 72 },
        priceTargetRange: { min: -5, max: 2 },
        volatilityMultiplier: 0.7,
    },
    MARKUP: {
        durationRange: { min: 48, max: 168 },
        priceTargetRange: { min: 10, max: 40 },
        volatilityMultiplier: 1.2,
    },
    DISTRIBUTION: {
        durationRange: { min: 24, max: 48 },
        priceTargetRange: { min: -3, max: 3 },
        volatilityMultiplier: 1.0,
    },
    MARKDOWN: {
        durationRange: { min: 36, max: 120 },
        priceTargetRange: { min: -40, max: -10 },
        volatilityMultiplier: 1.5,
    },
};
const BASE_TRANSITIONS = {
    ACCUMULATION: {
        ACCUMULATION: 0.15,
        MARKUP: 0.70,
        DISTRIBUTION: 0.10,
        MARKDOWN: 0.05,
    },
    MARKUP: {
        ACCUMULATION: 0.05,
        MARKUP: 0.25,
        DISTRIBUTION: 0.65,
        MARKDOWN: 0.05,
    },
    DISTRIBUTION: {
        ACCUMULATION: 0.10,
        MARKUP: 0.15,
        DISTRIBUTION: 0.10,
        MARKDOWN: 0.65,
    },
    MARKDOWN: {
        ACCUMULATION: 0.70,
        MARKUP: 0.10,
        DISTRIBUTION: 0.05,
        MARKDOWN: 0.15,
    },
};
class TrendManager {
    getPhaseContext(currentPhase, startPrice, targetPrice, phaseStartedAt, nextPhaseChangeAt) {
        const now = new Date();
        const startedAt = phaseStartedAt || now;
        const endsAt = nextPhaseChangeAt || new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const totalDuration = endsAt.getTime() - startedAt.getTime();
        const elapsed = now.getTime() - startedAt.getTime();
        const progress = Math.min(1, Math.max(0, elapsed / totalDuration));
        return {
            phase: currentPhase,
            startPrice,
            targetPrice,
            progress,
            startedAt,
            endsAt,
            durationHours: totalDuration / (60 * 60 * 1000),
        };
    }
    shouldTransitionPhase(nextPhaseChangeAt) {
        if (!nextPhaseChangeAt)
            return true;
        return new Date() >= nextPhaseChangeAt;
    }
    calculateNextPhase(currentPhase, bias, biasStrength) {
        const baseProbabilities = { ...BASE_TRANSITIONS[currentPhase] };
        const adjustedProbabilities = this.applyBias(baseProbabilities, bias, biasStrength / 100);
        return this.selectPhaseByProbability(adjustedProbabilities);
    }
    applyBias(probabilities, bias, strength) {
        const adjusted = { ...probabilities };
        if (bias === "NEUTRAL" || strength === 0) {
            return adjusted;
        }
        const biasMultiplier = strength * 0.5;
        if (bias === "BULLISH") {
            adjusted.MARKUP *= 1 + biasMultiplier;
            adjusted.ACCUMULATION *= 1 + biasMultiplier * 0.5;
            adjusted.MARKDOWN *= 1 - biasMultiplier;
            adjusted.DISTRIBUTION *= 1 - biasMultiplier * 0.3;
        }
        else if (bias === "BEARISH") {
            adjusted.MARKDOWN *= 1 + biasMultiplier;
            adjusted.DISTRIBUTION *= 1 + biasMultiplier * 0.5;
            adjusted.MARKUP *= 1 - biasMultiplier;
            adjusted.ACCUMULATION *= 1 - biasMultiplier * 0.3;
        }
        const total = Object.values(adjusted).reduce((sum, p) => sum + p, 0);
        for (const phase of Object.keys(adjusted)) {
            adjusted[phase] /= total;
        }
        return adjusted;
    }
    selectPhaseByProbability(probabilities) {
        const roll = Math.random();
        let cumulative = 0;
        for (const [phase, probability] of Object.entries(probabilities)) {
            cumulative += probability;
            if (roll <= cumulative) {
                return phase;
            }
        }
        return "ACCUMULATION";
    }
    calculatePhaseDuration(phase) {
        const config = PHASE_CONFIGS[phase];
        const { min, max } = config.durationRange;
        const range = max - min;
        const randomFactor = (Math.random() + Math.random() + Math.random()) / 3;
        return Math.round(min + range * randomFactor);
    }
    calculatePhaseTargetPrice(phase, startPrice, bias, biasStrength) {
        const config = PHASE_CONFIGS[phase];
        let { min, max } = config.priceTargetRange;
        if (bias && biasStrength) {
            const strength = biasStrength / 100;
            if (bias === "BULLISH") {
                const shift = (max - min) * strength * 0.3;
                min += shift;
                max += shift;
            }
            else if (bias === "BEARISH") {
                const shift = (max - min) * strength * 0.3;
                min -= shift;
                max -= shift;
            }
        }
        const targetPercent = min + Math.random() * (max - min);
        return startPrice * (1 + targetPercent / 100);
    }
    getVolatilityMultiplier(phase) {
        return PHASE_CONFIGS[phase].volatilityMultiplier;
    }
    async executePhaseTransition(marketMakerId, currentPrice, currentPhase, bias, biasStrength) {
        const newPhase = this.calculateNextPhase(currentPhase, bias, biasStrength);
        const durationHours = this.calculatePhaseDuration(newPhase);
        const phaseTargetPrice = this.calculatePhaseTargetPrice(newPhase, currentPrice, bias, biasStrength);
        const phaseStartedAt = new Date();
        const nextPhaseChangeAt = new Date(phaseStartedAt.getTime() + durationHours * 60 * 60 * 1000);
        try {
            await db_1.models.aiMarketMaker.update({
                currentPhase: newPhase,
                phaseStartedAt,
                nextPhaseChangeAt,
                phaseTargetPrice,
                volatilityMultiplier: this.getVolatilityMultiplier(newPhase),
            }, {
                where: { id: marketMakerId },
            });
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId,
                action: "PHASE_CHANGE",
                details: {
                    previousPhase: currentPhase,
                    newPhase,
                    phaseDuration: durationHours,
                    phaseTargetPrice,
                    triggeredBy: "SYSTEM",
                },
                priceAtAction: currentPrice,
                poolValueAtAction: 0,
            });
            console_1.logger.info("AI_MM", `Phase transition: ${currentPhase} -> ${newPhase} | Target: ${phaseTargetPrice.toFixed(6)} | Duration: ${durationHours}h`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Failed to execute phase transition", error);
            throw error;
        }
        return {
            newPhase,
            phaseTargetPrice,
            phaseStartedAt,
            nextPhaseChangeAt,
            durationHours,
        };
    }
    async forcePhaseTransition(marketMakerId, currentPrice, currentPhase, targetPhase, adminId) {
        const durationHours = this.calculatePhaseDuration(targetPhase);
        const phaseTargetPrice = this.calculatePhaseTargetPrice(targetPhase, currentPrice);
        const phaseStartedAt = new Date();
        const nextPhaseChangeAt = new Date(phaseStartedAt.getTime() + durationHours * 60 * 60 * 1000);
        try {
            await db_1.models.aiMarketMaker.update({
                currentPhase: targetPhase,
                phaseStartedAt,
                nextPhaseChangeAt,
                phaseTargetPrice,
                volatilityMultiplier: this.getVolatilityMultiplier(targetPhase),
            }, {
                where: { id: marketMakerId },
            });
            await db_1.models.aiMarketMakerHistory.create({
                marketMakerId,
                action: "PHASE_CHANGE",
                details: {
                    previousPhase: currentPhase,
                    newPhase: targetPhase,
                    phaseDuration: durationHours,
                    phaseTargetPrice,
                    triggeredBy: "ADMIN",
                    adminId,
                    note: "Forced phase transition",
                },
                priceAtAction: currentPrice,
                poolValueAtAction: 0,
            });
            console_1.logger.warn("AI_MM", `ADMIN forced phase transition: ${currentPhase} -> ${targetPhase}`);
        }
        catch (error) {
            console_1.logger.error("AI_MM", "Failed to force phase transition", error);
            throw error;
        }
        return {
            newPhase: targetPhase,
            phaseTargetPrice,
            phaseStartedAt,
            nextPhaseChangeAt,
            durationHours,
        };
    }
    async initializePhase(marketMakerId, startPrice, bias = "NEUTRAL", biasStrength = 50) {
        const phase = "ACCUMULATION";
        const durationHours = this.calculatePhaseDuration(phase);
        const phaseTargetPrice = this.calculatePhaseTargetPrice(phase, startPrice, bias, biasStrength);
        const phaseStartedAt = new Date();
        const nextPhaseChangeAt = new Date(phaseStartedAt.getTime() + durationHours * 60 * 60 * 1000);
        await db_1.models.aiMarketMaker.update({
            currentPhase: phase,
            phaseStartedAt,
            nextPhaseChangeAt,
            phaseTargetPrice,
            volatilityMultiplier: this.getVolatilityMultiplier(phase),
        }, {
            where: { id: marketMakerId },
        });
        console_1.logger.info("AI_MM", `Initialized phase for market maker ${marketMakerId}: ${phase}`);
        return {
            phase,
            phaseTargetPrice,
            phaseStartedAt,
            nextPhaseChangeAt,
        };
    }
    getPhaseConfig(phase) {
        return { ...PHASE_CONFIGS[phase] };
    }
    getAllPhaseConfigs() {
        return { ...PHASE_CONFIGS };
    }
}
exports.TrendManager = TrendManager;
exports.default = TrendManager;
