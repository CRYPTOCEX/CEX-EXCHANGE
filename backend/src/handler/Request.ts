import {
  HttpRequest,
  HttpResponse,
  MultipartField,
  RecognizedString,
  getParts,
} from "uWebSockets.js";
import url from "url";
import { HttpMethod } from "../types";
import { handleArrayBuffer } from "../utils";
import { validateSchema } from "../utils/validation";
import { createError } from "@b/utils/error";
import logger from "@b/utils/logger";
import ip from "ip";

// Metadata type for operations
export class Request {
  public url: string;
  public method: HttpMethod;
  public keys: string[] = [];
  public regExp: RegExp | undefined;
  public query: Record<string, any>;
  public body: any;
  public params: Record<string, string> = {};
  public cookies: Record<string, string> = {};
  public headers: Record<string, string> = {};
  public metadata?: any;
  public user: any = null;
  public remoteAddress: string;
  public connection: { encrypted: boolean; remoteAddress: string } = {
    encrypted: false,
    remoteAddress: "127.0.0.1",
  };

  public updatedCookies: Record<
    string,
    { value: string; options?: Record<string, any> }
  > = {};

  constructor(
    private res: HttpResponse,
    private req: HttpRequest
  ) {
    this.url = req.getUrl();
    this.method = req.getMethod() as HttpMethod;
    this.query = this.parseQuery();
    this.headers = this.parseHeaders();
    this.cookies = this.parseCookies();
    this.remoteAddress = this.computeRemoteAddress();

    // If metadata is already set (via setMetadata), validate parameters.
    if (this.metadata) {
      try {
        this.validateParameters();
      } catch (error: any) {
        logger(
          "error",
          "request",
          __filename,
          `Parameter validation failed: ${error.message}\n${error.stack}`
        );
        throw error;
      }
    }
  }

  /**
   * Parse request headers into a simple key-value object.
   */
  private parseHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    this.req.forEach((key: string, value: string) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Parses the Cookie header into an object.
   */
  private parseCookies(): Record<string, string> {
    const cookiesHeader: string = this.headers["cookie"] || "";
    const cookies: Record<string, string> = {};
    cookiesHeader
      .split(";")
      .map((c) => c.trim())
      .forEach((cookie: string) => {
        const eqIndex: number = cookie.indexOf("=");
        if (eqIndex > -1) {
          const name: string = cookie.substring(0, eqIndex).trim();
          const val: string = cookie.substring(eqIndex + 1).trim();
          cookies[name] = val;
        }
      });
    return cookies;
  }

  /**
   * Parses the URL query string into an object.
   */
  public parseQuery(): Record<string, any> {
    return url.parse(`?${this.req.getQuery()}`, true).query;
  }

  /**
   * Computes the remote address using uWebSockets.js utilities.
   */
  private computeRemoteAddress(): string {
    const remoteAddressBuffer: ArrayBuffer | null =
      this.res.getRemoteAddressAsText();
    const rawAddress: string = remoteAddressBuffer
      ? Buffer.from(remoteAddressBuffer).toString("utf-8")
      : "127.0.0.1";

    if (
      rawAddress === "::1" ||
      rawAddress === "0000:0000:0000:0000:0000:0000:0000:0001"
    ) {
      return "127.0.0.1";
    }
    return ip.isV6Format(rawAddress)
      ? ip.toString(ip.toBuffer(rawAddress))
      : rawAddress;
  }

  /**
   * Reads and processes the request body.
   * It parses only for methods that support a body.
   */
  public async parseBody(): Promise<void> {
    if (
      !["post", "put", "patch", "delete"].includes(this.method.toLowerCase())
    ) {
      return;
    }

    const contentType: string = this.headers["content-type"] || "";

    try {
      const bodyContent: string = await this.readRequestBody();
      this.body = this.processBodyContent(contentType, bodyContent);
    } catch (error: any) {
      logger(
        "error",
        "request",
        __filename,
        `Error reading body content: ${error.message}\n${error.stack}`
      );
      throw createError({
        statusCode: 400,
        message: `Error reading request body: ${error.message}`,
      });
    }

    // Validate against schema if metadata is provided.
    // Skip validation for multipart/form-data or if skipBodyValidation is set
    if (this.metadata?.requestBody && 
        !this.metadata?.skipBodyValidation &&
        !contentType.includes("multipart/form-data")) {
      try {
        const mediaType: string = Object.keys(
          this.metadata.requestBody.content
        )[0];
        const schema: any =
          this.metadata.requestBody.content[mediaType]?.schema;
        if (schema) {
          this.body = validateSchema(this.body, schema);
        }
      } catch (error: any) {
        logger(
          "error",
          "validation",
          __filename,
          `Schema validation failed: ${error.message}\n${error.stack}`
        );
        
        // Check if this is our custom validation error with user-friendly messages
        if (error.isValidationError) {
          throw createError({
            statusCode: 400,
            message: error.message, // This is now user-friendly
          });
        } else {
          throw createError({
            statusCode: 400,
            message: `Schema validation error: ${error.message}`,
          });
        }
      }
    }
  }

  /**
   * Reads the request body by accumulating incoming data chunks.
   */
  private async readRequestBody(): Promise<string> {
    const bodyData: string[] = [];
    return new Promise<string>((resolve, reject) => {
      let hadData: boolean = false;
      this.res.onData((ab: ArrayBuffer, isLast: boolean) => {
        hadData = true;
        const chunk: string = Buffer.from(ab).toString();
        bodyData.push(chunk);
        if (isLast) {
          resolve(bodyData.join(""));
        }
      });
      this.res.onAborted(() => {
        if (!hadData) {
          resolve("");
        } else {
          reject(new Error("Request aborted"));
        }
      });
    });
  }

  /**
   * Processes the raw body string based on content-type.
   */
  private processBodyContent(contentType: string, bodyContent: string): any {
    const trimmedBody: string = bodyContent.trim();
    if (contentType.includes("application/json") && trimmedBody !== "") {
      try {
        return JSON.parse(trimmedBody);
      } catch (error: any) {
        throw new Error(`Invalid JSON: ${error.message}`);
      }
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      return Object.fromEntries(new URLSearchParams(trimmedBody));
    }
    return trimmedBody || {};
  }

  /**
   * Validates request parameters against the provided metadata.
   */
  private validateParameters(): void {
    if (!this.metadata || !this.metadata.parameters) return;

    for (const parameter of this.metadata.parameters) {
      const value: string | undefined = this.getParameterValue(parameter);
      if (value === undefined && parameter.required) {
        throw new Error(
          `Missing required ${parameter.in} parameter: "${parameter.name}"`
        );
      }
      if (value !== undefined) {
        try {
          this.updateParameterValue(
            parameter,
            validateSchema(value, parameter.schema)
          );
        } catch (error: any) {
          // Check if this is our custom validation error with user-friendly messages
          if (error.isValidationError) {
            throw new Error(
              `Parameter "${parameter.name}": ${error.message}`
            );
          } else {
            throw new Error(
              `Validation error for ${parameter.in} parameter "${parameter.name}": ${error.message}`
            );
          }
        }
      }
    }
  }

  /**
   * Retrieves the parameter value based on its location.
   */
  private getParameterValue(parameter: any): string | undefined {
    switch (parameter.in) {
      case "query":
        return this.query[parameter.name];
      case "header":
        return this.headers[parameter.name];
      case "path":
        return this.params[parameter.name];
      case "cookie":
        return this.cookies[parameter.name];
      default:
        return undefined;
    }
  }

  /**
   * Updates the parameter value in the appropriate storage.
   */
  private updateParameterValue(parameter: any, value: any): void {
    switch (parameter.in) {
      case "query":
        this.query[parameter.name] = value;
        break;
      case "path":
        this.params[parameter.name] = value;
        break;
      case "cookie":
        this.cookies[parameter.name] = value;
        break;
    }
  }

  /**
   * Sets the regular expression parameters for dynamic routes.
   */
  public _setRegexparam(keys: string[], regExp: RegExp): void {
    this.keys = keys;
    this.regExp = regExp;
  }

  public getHeader(lowerCaseKey: RecognizedString): string {
    return this.req.getHeader(lowerCaseKey);
  }

  public getParameter(index: number): string {
    return this.req.getParameter(index)!;
  }

  public getUrl(): string {
    return this.req.getUrl();
  }

  public getMethod(): HttpMethod {
    return this.req.getMethod() as HttpMethod;
  }

  public getCaseSensitiveMethod(): string {
    return this.req.getCaseSensitiveMethod();
  }

  public getQuery(): string {
    return this.req.getQuery();
  }

  public setYield(_yield: boolean): boolean {
    this.req.setYield(_yield);
    return _yield;
  }

  /**
   * Extracts path parameters from the URL using the provided regular expression.
   */
  public extractPathParameters(): void {
    if (!this.regExp) return;

    const matches: RegExpExecArray | null = this.regExp.exec(this.url);
    if (!matches) return;

    this.keys.forEach((key: string, index: number): void => {
      const value: string | undefined = matches[index + 1];
      if (value !== undefined) {
        this.params[key] = decodeURIComponent(value);
      }
    });
  }

  /**
   * Returns a promise that resolves with the raw body as a given type.
   */
  public async rawBody<T>(): Promise<T | null> {
    return new Promise<T | null>((resolve, reject) => {
      this.res.onData((data: ArrayBuffer) =>
        resolve(handleArrayBuffer(data) as T)
      );
      this.res.onAborted(() => reject(null));
    });
  }

  /**
   * Parses multipart/form-data and returns the fields.
   */
  public async file(): Promise<MultipartField[] | undefined> {
    const header: string = this.req.getHeader("content-type");
    return new Promise<MultipartField[] | undefined>((resolve, reject) => {
      let buffer: Buffer = Buffer.from("");
      this.res.onData((ab: ArrayBuffer, isLast: boolean) => {
        buffer = Buffer.concat([buffer, Buffer.from(ab)]);
        if (isLast) {
          resolve(getParts(buffer, header));
        }
      });
      this.res.onAborted(() => reject(null));
    });
  }

  /**
   * Updates a cookie value to be sent later.
   */
  public updateCookie(
    name: string,
    value: string,
    options: Record<string, any> = {}
  ): void {
    this.updatedCookies[name] = { value, options };
  }

  /**
   * Updates multiple tokens as cookies.
   */
  public updateTokens(tokens: Record<string, string>): void {
    Object.entries(tokens).forEach(([name, value]) => {
      this.updatedCookies[name] = { value };
    });
  }

  public setMetadata(metadata: any): void {
    this.metadata = metadata;
  }

  public getMetadata(): any | undefined {
    return this.metadata;
  }

  public setUser(user: any): void {
    this.user = user;
  }

  public getUser(): { id: number; role: number } | null {
    return this.user;
  }
}
