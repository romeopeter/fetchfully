/**
 * This file contains custom error classes for the Fetch API
 * */

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

export class HttpError extends Error {
  //@ts-ignore
  private status: string | number;
  //@ts-ignore
  private statusText: string;

  constructor(status: number | string, statusText: string) {
    super(`HTTP Error! Status: ${status} - ${statusText}`);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

export class CorsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorsError";

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }
}
