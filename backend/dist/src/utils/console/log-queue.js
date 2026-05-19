"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logQueue = void 0;
const log_update_1 = __importDefault(require("log-update"));
class LogQueueManager {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.liveModeActive = false;
        this.liveTaskCount = 0;
        this.pendingPrints = [];
        this.lastLiveContent = "";
    }
    static getInstance() {
        if (!LogQueueManager.instance) {
            LogQueueManager.instance = new LogQueueManager();
        }
        return LogQueueManager.instance;
    }
    liveStart() {
        this.liveTaskCount++;
        this.liveModeActive = true;
    }
    liveUpdate(content) {
        this.queue.push({ type: "live-update", content });
        this.processQueue();
    }
    liveClear() {
        this.queue.push({ type: "live-clear" });
        this.processQueue();
    }
    liveDone(finalOutput) {
        this.queue.push({ type: "live-done", finalOutput });
        this.processQueue();
    }
    print(content) {
        this.queue.push({ type: "print", content });
        this.processQueue();
    }
    printAtomic(lines) {
        this.queue.push({ type: "print-atomic", lines });
        this.processQueue();
    }
    isLiveModeActive() {
        return this.liveModeActive;
    }
    getLiveTaskCount() {
        return this.liveTaskCount;
    }
    processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const entry = this.queue.shift();
            switch (entry.type) {
                case "live-update":
                    if (this.pendingPrints.length > 0 && this.liveModeActive) {
                        log_update_1.default.clear();
                        for (const line of this.pendingPrints) {
                            console.log(line);
                        }
                        this.pendingPrints = [];
                    }
                    this.liveModeActive = true;
                    this.lastLiveContent = entry.content;
                    (0, log_update_1.default)(entry.content);
                    break;
                case "live-clear":
                    log_update_1.default.clear();
                    this.lastLiveContent = "";
                    break;
                case "live-done":
                    this.liveTaskCount = Math.max(0, this.liveTaskCount - 1);
                    if (this.liveTaskCount > 0) {
                        if (entry.finalOutput) {
                            log_update_1.default.clear();
                            console.log(entry.finalOutput);
                        }
                    }
                    else {
                        if (entry.finalOutput) {
                            log_update_1.default.clear();
                            console.log(entry.finalOutput);
                        }
                        else {
                            log_update_1.default.done();
                        }
                        this.liveModeActive = false;
                        this.lastLiveContent = "";
                        for (const line of this.pendingPrints) {
                            console.log(line);
                        }
                        this.pendingPrints = [];
                    }
                    break;
                case "print":
                    if (this.liveModeActive) {
                        this.pendingPrints.push(entry.content);
                    }
                    else {
                        console.log(entry.content);
                    }
                    break;
                case "print-atomic":
                    if (this.liveModeActive) {
                        const savedContent = this.lastLiveContent;
                        log_update_1.default.clear();
                        for (const line of this.pendingPrints) {
                            console.log(line);
                        }
                        this.pendingPrints = [];
                        console.log(entry.lines.join("\n"));
                        if (this.liveTaskCount > 0 && savedContent) {
                            (0, log_update_1.default)(savedContent);
                        }
                    }
                    else {
                        console.log(entry.lines.join("\n"));
                    }
                    break;
            }
        }
        this.processing = false;
    }
    flush() {
        if (this.liveModeActive) {
            log_update_1.default.done();
            this.liveModeActive = false;
            this.liveTaskCount = 0;
        }
        for (const line of this.pendingPrints) {
            console.log(line);
        }
        this.pendingPrints = [];
    }
}
exports.logQueue = LogQueueManager.getInstance();
exports.default = exports.logQueue;
