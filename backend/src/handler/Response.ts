// File: handler/Response.ts

import {
  HttpResponse,
  RecognizedString,
  us_socket_context_t,
} from "uWebSockets.js";
import zlib from "zlib";
import { getCommonExpiration, getStatusMessage } from "../utils";
import { Request } from "./Request";
import logger from "@b/utils/logger";

const isProd: boolean = process.env.NODE_ENV === "production";

// --------------------------------------------------------------------------
// Cookie Helper Types & Functions
// --------------------------------------------------------------------------

interface CookieOptions {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expires?: string;
}

/**
 * Builds a cookie header string from a name, value, and options.
 *
 * @param name - Cookie name.
 * @param value - Cookie value.
 * @param options - Additional cookie options.
 * @returns The formatted cookie header string.
 */
function buildCookieHeader(
  name: string,
  value: string,
  options?: CookieOptions
): string {
  let cookie = `${name}=${value};`;
  cookie += ` Path=${options?.path ?? "/"};`;
  if (options?.httpOnly) {
    cookie += " HttpOnly;";
  }
  if (options?.secure) {
    cookie += " Secure;";
  }
  if (options?.sameSite) {
    cookie += ` SameSite=${options.sameSite};`;
  }
  if (options?.expires) {
    cookie += ` Expires=${options.expires};`;
  }
  return cookie;
}

// --------------------------------------------------------------------------
// Response Class
// --------------------------------------------------------------------------

export class Response {
  private aborted = false;

  constructor(private res: HttpResponse) {
    this.res.onAborted((): void => {
      this.aborted = true;
    });
  }

  isAborted(): boolean {
    return this.aborted;
  }

  public handleError(code: number, message: any): void {
    if (this.aborted) {
      return;
    }
    
    const errorMsg: string =
      typeof message === "string" ? message : String(message);
    this.res.cork((): void => {
      this.res
        .writeStatus(`${code} ${getStatusMessage(code)}`)
        .writeHeader("Content-Type", "application/json")
        .writeHeader("Content-Encoding", "identity")
        .writeHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        .writeHeader("Pragma", "no-cache")
        .writeHeader("Expires", "0")
        .end(JSON.stringify({ message: errorMsg, statusCode: code }));
    });
  }

  pause(): void {
    this.res.pause();
  }

  resume(): void {
    this.res.resume();
  }

  writeStatus(status: RecognizedString): HttpResponse {
    return this.res.writeStatus(status);
  }

  writeHeader(key: RecognizedString, value: RecognizedString): HttpResponse {
    return this.res.writeHeader(key, value);
  }

  write(chunk: RecognizedString): boolean {
    return this.res.write(chunk);
  }

  endWithoutBody(
    reportedContentLength?: number,
    closeConnection?: boolean
  ): void {
    this.res.endWithoutBody(reportedContentLength, closeConnection);
  }

  tryEnd(fullBodyOrChunk: RecognizedString, totalSize: number): boolean {
    const [result] = this.res.tryEnd(fullBodyOrChunk, totalSize);
    return result;
  }

  close(): void {
    this.res.close();
  }

  getWriteOffset(): number {
    return this.res.getWriteOffset();
  }

  onWritable(handler: (offset: number) => boolean): void {
    this.res.onWritable(handler);
  }

  onAborted(handler: () => void): void {
    this.res.onAborted(handler);
  }

  onData(handler: (chunk: ArrayBuffer, isLast: boolean) => void): void {
    this.res.onData(handler);
  }

  getRemoteAddress(): any {
    return this.res.getRemoteAddress();
  }

  getRemoteAddressAsText(): string {
    const addrBuffer: ArrayBuffer = this.res.getRemoteAddressAsText();
    return new TextDecoder().decode(addrBuffer);
  }

  getProxiedRemoteAddress(): any {
    return this.res.getProxiedRemoteAddress();
  }

  getProxiedRemoteAddressAsText(): string {
    const addrBuffer: ArrayBuffer = this.res.getProxiedRemoteAddressAsText();
    return new TextDecoder().decode(addrBuffer);
  }

  cork(cb: () => void): void {
    this.res.cork(cb);
  }

  status(statusCode: number): this {
    const message: string = getStatusMessage(statusCode);
    this.writeStatus(`${statusCode} ${message}`);
    return this;
  }

  upgrade<UserData>(
    userData: UserData,
    secWebSocketKey: RecognizedString,
    secWebSocketProtocol: RecognizedString,
    secWebSocketExtensions: RecognizedString,
    context: us_socket_context_t
  ): void {
    this.res.upgrade(
      userData,
      secWebSocketKey,
      secWebSocketProtocol,
      secWebSocketExtensions,
      context
    );
  }

  end(body?: RecognizedString, closeConnection?: boolean): void {
    this.res.end(body, closeConnection);
  }

  json<T>(data: T): void {
    this.res
      .writeHeader("Content-Type", "application/json")
      .end(JSON.stringify(data));
  }

  pipe(stream: NodeJS.ReadableStream): void {
    this.res.pipe(stream);
  }

  // ------------------------------------------------------------------------
  // Cookie Management
  // ------------------------------------------------------------------------

  public setSecureCookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None";
    }
  ): void {
    const cookieValue: string = buildCookieHeader(name, value, {
      path: "/",
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
    });
    this.writeHeader("Set-Cookie", cookieValue);
  }

  setSecureCookies(
    {
      accessToken,
      csrfToken,
      sessionId,
    }: { accessToken: string; csrfToken: string; sessionId: string },
    request: Request
  ): void {
    const secure: boolean = isProd;
    this.setSecureCookie("accessToken", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "None",
    });
    this.setSecureCookie("csrfToken", csrfToken, {
      httpOnly: false,
      secure,
      sameSite: "Strict",
    });
    this.setSecureCookie("sessionId", sessionId, {
      httpOnly: true,
      secure,
      sameSite: "None",
    });

    this.applyUpdatedCookies(request);
  }

  public applyUpdatedCookies(request: Request): void {
    const cookiesToUpdate: string[] = ["accessToken", "csrfToken", "sessionId"];
    cookiesToUpdate.forEach((cookieName: string): void => {
      if (request.updatedCookies[cookieName]) {
        const { value } = request.updatedCookies[cookieName];
        if (request.headers.platform === "app") {
          this.writeHeader(cookieName, value);
          return;
        }
        const expiration: string | null =
          getCommonExpiration(cookieName) || null;
        const cookieValue: string = buildCookieHeader(cookieName, value, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          expires: expiration || undefined,
        });
        this.writeHeader("Set-Cookie", cookieValue);
      }
    });
  }

  public writeCommonHeaders(): void {
    const headers: { [key: string]: string } = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    };

    Object.entries(headers).forEach(([key, value]: [string, string]): void => {
      this.res.writeHeader(key, value);
    });
  }

  public deleteSecureCookies(): void {
    ["accessToken", "csrfToken", "sessionId"].forEach(
      (cookieName: string): void => {
        this.writeHeader(
          "Set-Cookie",
          `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`
        );
      }
    );
  }

  // ------------------------------------------------------------------------
  // Sending Response
  // ------------------------------------------------------------------------

  public async sendResponse(
    req: Request,
    statusCode: number | string,
    responseData: any
  ): Promise<void> {
    if (this.aborted) {
      return;
    }

    try {
      this.res.cork((): void => {
        const response: Buffer = this.compressResponse(req, responseData);
        this.handleCookiesInResponse(req, Number(statusCode), responseData);
        this.writeCommonHeaders();
        this.res.writeStatus(
          `${statusCode} ${getStatusMessage(Number(statusCode))}`
        );
        this.res.writeHeader("Content-Type", "application/json");
        this.res.end(response);
      });
    } catch (error: any) {
      logger(
        "error",
        "response",
        __filename,
        `Error sending response: ${error.message}`
      );
      if (!this.aborted) {
        this.res.cork((): void => {
          this.res.writeStatus("500").end(error.message);
        });
      }
    }
  }

  private handleCookiesInResponse(
    req: Request,
    statusCode: number,
    responseData: any
  ): void {
    if (responseData?.cookies && [200, 201].includes(statusCode)) {
      Object.entries(responseData.cookies).forEach(([name, value]) => {
        req.updateCookie(name, value as string);
      });
      delete responseData.cookies;
    }

    if (req.url.startsWith("/api/auth")) {
      this.applyUpdatedCookies(req);
    }
  }

  /**
   * Compresses the response based on the client's Accept-Encoding header.
   * If the response is below a certain threshold, compression is skipped.
   *
   * @param req - The request object.
   * @param responseData - The data to send.
   * @returns A Buffer containing the (possibly compressed) response.
   */
  private compressResponse(req: Request, responseData: any): Buffer {
    const acceptEncoding: string = req.headers["accept-encoding"] || "";
    let rawData: Buffer;

    try {
      rawData = Buffer.from(JSON.stringify(responseData ?? {}));
    } catch {
      rawData = Buffer.from(JSON.stringify({}));
    }

    const sizeThreshold: number = 1024;
    if (rawData.length < sizeThreshold) {
      this.res.writeHeader("Content-Encoding", "identity");
      return rawData;
    }

    let contentEncoding: string = "identity";
    try {
      if (acceptEncoding.includes("gzip")) {
        rawData = zlib.gzipSync(rawData);
        contentEncoding = "gzip";
      } else if (
        acceptEncoding.includes("br") &&
        typeof zlib.brotliCompressSync === "function"
      ) {
        rawData = zlib.brotliCompressSync(rawData);
        contentEncoding = "br";
      } else if (acceptEncoding.includes("deflate")) {
        rawData = zlib.deflateSync(rawData);
        contentEncoding = "deflate";
      }
    } catch (compressionError: any) {
      logger(
        "warn",
        "response",
        __filename,
        `Compression error: ${compressionError.message}`
      );
      rawData = Buffer.from(JSON.stringify(responseData ?? {}));
      contentEncoding = "identity";
    }

    this.res.writeHeader("Content-Encoding", contentEncoding);
    return rawData;
  }
}
