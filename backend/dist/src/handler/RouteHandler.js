"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteHandler = void 0;
const utils_1 = require("../utils");
const Request_1 = require("./Request");
const Response_1 = require("./Response");
const console_1 = require("@b/utils/console");
const route_matcher_1 = require("./utils/route-matcher");
const middleware_runner_1 = require("./utils/middleware-runner");
class RouteHandler {
    constructor() {
        this.routes = [];
        this.routeBuckets = new Map();
        this.middlewares = [];
        this.errorHandler = utils_1.errHandlerFn;
        this.notFoundHandler = utils_1.notFoundFn;
    }
    set(method, path, ...handler) {
        const { keys, pattern } = (0, route_matcher_1.parseRoutePath)(path);
        const route = { handler, method, path, regExp: pattern, keys };
        this.routes.push(route);
        (0, route_matcher_1.addRouteToBuckets)(this.routeBuckets, route);
    }
    use(middleware) {
        this.middlewares.push(middleware);
    }
    error(cb) {
        this.errorHandler = cb;
    }
    notFound(cb) {
        this.notFoundHandler = cb;
    }
    findRoutes(path, method) {
        return (0, route_matcher_1.findMatchingRoute)(this.routeBuckets, path, method);
    }
    runSafeInternal(fn, res, req, next) {
        (0, middleware_runner_1.runSafe)(fn, res, req, next, this.errorHandler);
    }
    applyMiddleware(res, req, done) {
        if (this.middlewares.length === 0)
            return done();
        let index = 0;
        const next = () => {
            index++;
            if (index < this.middlewares.length) {
                this.runSafeInternal(this.middlewares[index], res, req, next);
            }
            else {
                done();
            }
        };
        this.runSafeInternal(this.middlewares[index], res, req, next);
    }
    applyHandler(res, req, handlers) {
        let index = 0;
        const next = () => {
            index++;
            if (index < handlers.length) {
                this.runSafeInternal(handlers[index], res, req, next);
            }
        };
        this.runSafeInternal(handlers[index], res, req, next);
    }
    processRoute(response, request, markResponseSent) {
        const req = new Request_1.Request(response, request);
        const res = new Response_1.Response(response);
        const route = this.findRoutes(req.url, req.method);
        if (route) {
            req._setRegexparam(route.keys, route.regExp);
            req.extractPathParameters();
        }
        try {
            this.applyMiddleware(res, req, () => {
                if (route) {
                    this.applyHandler(res, req, route.handler);
                }
                else {
                    this.runSafeInternal(this.notFoundHandler, res, req, () => { });
                }
                markResponseSent();
            });
        }
        catch (err) {
            console_1.logger.error("ROUTE", "Error processing route", err);
            this.errorHandler(err, res, req);
            markResponseSent();
        }
    }
}
exports.RouteHandler = RouteHandler;
