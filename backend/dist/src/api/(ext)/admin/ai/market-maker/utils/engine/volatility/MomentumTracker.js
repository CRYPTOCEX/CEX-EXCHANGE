"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MomentumTracker = void 0;
const DEFAULT_EVENT_CONFIG = {
    eventProbability: 0.0005,
    minMagnitude: 0.5,
    maxMagnitude: 3.0,
};
const EVENT_PROBABILITIES = {
    SURGE: 0.35,
    DUMP: 0.30,
    SPIKE: 0.25,
    FLASH_CRASH: 0.10,
};
class MomentumTracker {
    constructor(eventConfig) {
        this.states = new Map();
        this.eventConfig = { ...DEFAULT_EVENT_CONFIG, ...eventConfig };
    }
    getState(marketId) {
        if (!this.states.has(marketId)) {
            this.states.set(marketId, {
                momentum: 0,
                lastUpdate: new Date(),
                activeEvent: null,
                eventHistory: [],
                consecutiveDirection: 0,
            });
        }
        return this.states.get(marketId);
    }
    getCurrentMomentum(marketId) {
        return this.getState(marketId).momentum;
    }
    updateMomentum(marketId, direction, magnitude, decayRate = 0.95) {
        const state = this.getState(marketId);
        state.momentum = this.applyDecay(state, decayRate);
        const directionMultiplier = direction === "BUY" ? 1 : -1;
        const momentumChange = directionMultiplier * Math.min(magnitude * 0.1, 0.1);
        state.momentum += momentumChange;
        if ((direction === "BUY" && state.consecutiveDirection >= 0) ||
            (direction === "SELL" && state.consecutiveDirection <= 0)) {
            state.consecutiveDirection += directionMultiplier;
        }
        else {
            state.consecutiveDirection = directionMultiplier;
        }
        if (Math.abs(state.consecutiveDirection) > 5) {
            state.momentum += directionMultiplier * 0.02;
        }
        state.momentum = Math.max(-1, Math.min(1, state.momentum));
        state.lastUpdate = new Date();
        return state.momentum;
    }
    decayMomentum(marketId, decayRate, elapsedMs) {
        const state = this.getState(marketId);
        state.momentum = this.applyDecay(state, decayRate, elapsedMs);
        state.lastUpdate = new Date();
        return state.momentum;
    }
    applyDecay(state, decayRate, elapsedMs) {
        const elapsed = elapsedMs !== null && elapsedMs !== void 0 ? elapsedMs : Date.now() - state.lastUpdate.getTime();
        const decaySteps = elapsed / 1000;
        return state.momentum * Math.pow(decayRate, decaySteps);
    }
    checkForMomentumEvent(marketId, customConfig) {
        const state = this.getState(marketId);
        const config = { ...this.eventConfig, ...customConfig };
        if (state.activeEvent) {
            const elapsed = Date.now() - state.activeEvent.startedAt.getTime();
            if (elapsed < state.activeEvent.duration) {
                return this.getDecayedEvent(state.activeEvent);
            }
            else {
                state.activeEvent = null;
            }
        }
        if (Math.random() < config.eventProbability) {
            const event = this.generateEvent(config);
            state.activeEvent = event;
            state.eventHistory.push({
                type: event.type,
                magnitude: event.magnitude,
                timestamp: new Date(),
            });
            if (state.eventHistory.length > 20) {
                state.eventHistory.shift();
            }
            return event;
        }
        return null;
    }
    getActiveEvent(marketId) {
        const state = this.getState(marketId);
        if (!state.activeEvent)
            return null;
        const elapsed = Date.now() - state.activeEvent.startedAt.getTime();
        if (elapsed >= state.activeEvent.duration) {
            state.activeEvent = null;
            return null;
        }
        return this.getDecayedEvent(state.activeEvent);
    }
    getDecayedEvent(event) {
        const elapsed = Date.now() - event.startedAt.getTime();
        const progress = elapsed / event.duration;
        const decayFactor = Math.pow(event.decayRate, progress * 10);
        return {
            ...event,
            magnitude: event.magnitude * decayFactor,
        };
    }
    generateEvent(config) {
        const type = this.selectEventType();
        const baseConfig = this.getEventConfig(type);
        const magnitude = config.minMagnitude +
            Math.random() * (config.maxMagnitude - config.minMagnitude);
        const adjustedMagnitude = magnitude * baseConfig.magnitudeMultiplier;
        return {
            type,
            magnitude: adjustedMagnitude,
            duration: baseConfig.duration,
            decayRate: baseConfig.decayRate,
            startedAt: new Date(),
        };
    }
    selectEventType() {
        const roll = Math.random();
        let cumulative = 0;
        for (const [type, probability] of Object.entries(EVENT_PROBABILITIES)) {
            cumulative += probability;
            if (roll <= cumulative) {
                return type;
            }
        }
        return "SURGE";
    }
    getEventConfig(type) {
        switch (type) {
            case "SURGE":
                return {
                    magnitudeMultiplier: 0.5,
                    duration: 300000,
                    decayRate: 0.85,
                };
            case "DUMP":
                return {
                    magnitudeMultiplier: -0.6,
                    duration: 240000,
                    decayRate: 0.8,
                };
            case "SPIKE":
                return {
                    magnitudeMultiplier: Math.random() > 0.5 ? 0.7 : -0.7,
                    duration: 60000,
                    decayRate: 0.7,
                };
            case "FLASH_CRASH":
                return {
                    magnitudeMultiplier: -0.8,
                    duration: 30000,
                    decayRate: 0.6,
                };
        }
    }
    triggerEvent(marketId, type, magnitude, durationMs) {
        const state = this.getState(marketId);
        const baseConfig = this.getEventConfig(type);
        const event = {
            type,
            magnitude,
            duration: durationMs !== null && durationMs !== void 0 ? durationMs : baseConfig.duration,
            decayRate: baseConfig.decayRate,
            startedAt: new Date(),
        };
        state.activeEvent = event;
        state.eventHistory.push({
            type: event.type,
            magnitude: event.magnitude,
            timestamp: new Date(),
        });
        return event;
    }
    clearEvent(marketId) {
        const state = this.getState(marketId);
        state.activeEvent = null;
    }
    setMomentum(marketId, momentum, lastUpdate) {
        const state = this.getState(marketId);
        state.momentum = Math.max(-1, Math.min(1, momentum));
        state.lastUpdate = lastUpdate !== null && lastUpdate !== void 0 ? lastUpdate : new Date();
    }
    getEventHistory(marketId) {
        return [...this.getState(marketId).eventHistory];
    }
    getFullState(marketId) {
        return { ...this.getState(marketId) };
    }
    resetState(marketId) {
        this.states.delete(marketId);
    }
    updateConfig(config) {
        this.eventConfig = { ...this.eventConfig, ...config };
    }
}
exports.MomentumTracker = MomentumTracker;
exports.default = MomentumTracker;
