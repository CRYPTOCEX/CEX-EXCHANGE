"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSafe = runSafe;
exports.createMiddlewareRunner = createMiddlewareRunner;
exports.createHandlerRunner = createHandlerRunner;
const console_1 = require("@b/utils/console");
function runSafe(fn, res, req, next, errorHandler) {
    try {
        fn(res, req, next);
    }
    catch (err) {
        console_1.logger.error("ROUTE", "Error in middleware/handler", err);
        errorHandler(err, res, req);
    }
}
function createMiddlewareRunner(middlewares, errorHandler) {
    return function applyMiddleware(res, req, done) {
        if (middlewares.length === 0) {
            return done();
        }
        let index = 0;
        const next = () => {
            index++;
            if (index < middlewares.length) {
                runSafe(middlewares[index], res, req, next, errorHandler);
            }
            else {
                done();
            }
        };
        runSafe(middlewares[index], res, req, next, errorHandler);
    };
}
function createHandlerRunner(errorHandler) {
    return function applyHandler(res, req, handlers) {
        if (handlers.length === 0) {
            return;
        }
        let index = 0;
        const next = () => {
            index++;
            if (index < handlers.length) {
                runSafe(handlers[index], res, req, next, errorHandler);
            }
        };
        runSafe(handlers[index], res, req, next, errorHandler);
    };
}
