// handler/RouteHandler.ts

import { parse } from "regexparam";
import { HttpRequest, HttpResponse } from "uWebSockets.js";
import { HttpMethod, IErrorHandler, IRequestHandler, IRoute } from "../types";
import { errHandlerFn, notFoundFn } from "../utils";
import { Request } from "./Request";
import { Response } from "./Response";
import logger from "@b/utils/logger";

export class RouteHandler {
  private routes: IRoute[] = [];
  private middlewares: IRequestHandler[] = [];

  private errorHandler: IErrorHandler = errHandlerFn;
  private notFoundHandler: IRequestHandler = notFoundFn;

  public set(method: HttpMethod, path: string, ...handler: IRequestHandler[]) {
    const { keys, pattern } = parse(path);
    this.routes.push({ handler, method, path, regExp: pattern, keys });
  }

  public use(middleware: IRequestHandler) {
    this.middlewares.push(middleware);
  }

  public error(cb: IErrorHandler) {
    this.errorHandler = cb;
  }

  public notFound(cb: IRequestHandler) {
    this.notFoundHandler = cb;
  }

  private findRoutes(path: string, method: HttpMethod): IRoute | undefined {
    for (const route of this.routes) {
      if (
        (route.method === method || route.method === "all") &&
        route.regExp.test(path)
      ) {
        return route;
      }
    }
  }

  private runSafe(
    fn: (res: Response, req: Request, next: VoidFunction) => void,
    res: Response,
    req: Request,
    next: VoidFunction
  ) {
    try {
      fn(res, req, next);
    } catch (err) {
      logger(
        "error",
        "route",
        __filename,
        `Error in middleware/handler: ${err.message}`
      );
      this.errorHandler(err, res, req);
    }
  }

  private applyMiddleware(res: Response, req: Request, done: VoidFunction) {
    if (this.middlewares.length === 0) return done();

    let index = 0;

    const next = () => {
      index++;
      if (index < this.middlewares.length) {
        this.runSafe(this.middlewares[index], res, req, next);
      } else {
        done();
      }
    };

    this.runSafe(this.middlewares[index], res, req, next);
  }

  private applyHandler(
    res: Response,
    req: Request,
    handlers: IRequestHandler[]
  ) {
    let index = 0;

    const next = () => {
      index++;
      if (index < handlers.length) {
        this.runSafe(handlers[index], res, req, next);
      }
    };

    this.runSafe(handlers[index], res, req, next);
  }

  public processRoute(
    response: HttpResponse,
    request: HttpRequest,
    markResponseSent: () => void
  ) {
    const req = new Request(response, request);
    const res = new Response(response);

    const route = this.findRoutes(req.url, req.method);
    if (route) {
      req._setRegexparam(route.keys, route.regExp);
      req.extractPathParameters();
    }

    try {
      this.applyMiddleware(res, req, () => {
        if (route) {
          this.applyHandler(res, req, route.handler);
        } else {
          this.runSafe(this.notFoundHandler, res, req, () => {});
        }
        markResponseSent();
      });
    } catch (err) {
      logger(
        "error",
        "route",
        __filename,
        `Error processing route: ${err.message}`
      );
      this.errorHandler(err, res, req);
      markResponseSent();
    }
  }
}
