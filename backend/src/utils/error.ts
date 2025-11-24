import { logError } from "@b/utils/logger";

export interface ErrorOptions {
  statusCode: number;
  message: string;
}

export class CustomError extends Error {
  statusCode: number;
  message: string;

  constructor(statusCode: number, message: string);
  constructor(options: ErrorOptions);
  constructor(arg1: any, arg2?: any) {
    const statusCode = typeof arg1 === "object" ? arg1.statusCode : arg1;
    const message = typeof arg1 === "object" ? arg1.message : arg2;

    super(message);
    this.statusCode = statusCode;
    this.message = message;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function createError(statusCode: number, message: string): CustomError;
export function createError(options: ErrorOptions): CustomError;
export function createError(arg1: any, arg2?: any): CustomError {
  if (typeof arg1 === "object") {
    return new CustomError(arg1);
  } else {
    return new CustomError(arg1, arg2 as string);
  }
}
