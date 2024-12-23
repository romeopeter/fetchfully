/**
 * This file contains custom error classes for the Fetch API
 * */

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class HttpError extends Error {
  private status;
  private statusText;

  constructor(status: number | string, statusText: string) {
    super(`HTTP Error! Status: ${status} - ${statusText}`);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;
  }
}

export class CorsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorsError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}
