// types.ts

import { Request } from "./handler/Request";
import { Response } from "./handler/Response";

export type IRequestHandler = (
  res: Response,
  req: Request,
  next?: VoidFunction
) => void;

export interface IRoute {
  regExp: RegExp;
  path: string;
  handler: IRequestHandler[];
  method: HttpMethod;
  keys: string[];
}

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head"
  | "connect"
  | "trace"
  | "all";

export type IErrorHandler = (err: any, res: Response, req: Request) => void;

export type HttpContentType =
  | "application/x-www-form-urlencoded"
  | "application/json"
  | string;
