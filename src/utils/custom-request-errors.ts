/**
 * This file contains custom error classes for the Fetch API
 * */

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

export class HttpError extends Error {
  /** Final URL of the response */
  readonly URL: string;
  /** HTTP status code, e.g. 404 */
  readonly status: number | string;
  /** HTTP status text, e.g. "Not Found" */
  readonly statusText: string;

  constructor(status: number | string, statusText: string, url: string) {
    super(`HTTP Error! Status: ${status} - ${statusText}`);
    this.name = "HttpError";
    this.URL = url;
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
      Error.captureStackTrace(this, CorsError);
    }
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

export class CancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CancelError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CancelError);
    }
  }
}
