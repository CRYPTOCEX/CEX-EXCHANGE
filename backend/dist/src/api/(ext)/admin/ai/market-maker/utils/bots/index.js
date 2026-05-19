"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./BaseBot"), exports);
__exportStar(require("./personalities/ScalperBot"), exports);
__exportStar(require("./personalities/SwingBot"), exports);
__exportStar(require("./personalities/AccumulatorBot"), exports);
__exportStar(require("./personalities/DistributorBot"), exports);
__exportStar(require("./personalities/MarketMakerBot"), exports);
__exportStar(require("./BotFactory"), exports);
__exportStar(require("./BotManager"), exports);
__exportStar(require("./BotCoordinator"), exports);
__exportStar(require("./behavior/TimingGenerator"), exports);
__exportStar(require("./behavior/SizeGenerator"), exports);
__exportStar(require("./behavior/PriceGenerator"), exports);
__exportStar(require("./behavior/HumanSimulator"), exports);
