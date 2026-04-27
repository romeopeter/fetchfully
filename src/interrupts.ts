import type {
  FetchfullyConfig,
  FetchfullyResponse,
  Interrupts,
  RequestInterruptHandler,
  ResponseInterruptHandlers,
} from "./types";

/* ------------------------------------------------------------ */

/**
 * Fetchfully InterruptStack class and related functions
 */
export class RequestInterruptStack<THandler> {
  private handlers: Map<number, THandler> = new Map();
  private nextId = 0;

  use(handler: THandler): () => void {
    const id = this.nextId++;
    this.handlers.set(id, handler);
    return () => {
      this.handlers.delete(id);
    };
  }

  all(): THandler[] {
    return Array.from(this.handlers.values());
  }
}

// Standalone class — same internals as InterruptStack but use() accepts two optional function args
export class ResponseInterruptStack {
  private handlers: Map<number, ResponseInterruptHandlers> = new Map();
  private nextId = 0;

  use(
    onFulfilled?: ResponseInterruptHandlers["onFulfilled"],
    onRejected?: ResponseInterruptHandlers["onRejected"]
  ): () => void {
    const id = this.nextId++;
    this.handlers.set(id, { onFulfilled, onRejected });
    return () => {
      this.handlers.delete(id);
    };
  }

  all(): ResponseInterruptHandlers[] {
    return Array.from(this.handlers.values());
  }
}

export function createInterrupts(): Interrupts {
  return {
    request: new RequestInterruptStack<RequestInterruptHandler>(),
    response: new ResponseInterruptStack(),
  };
}

export async function runRequestInterrupts(
  config: FetchfullyConfig,
  stack: RequestInterruptStack<RequestInterruptHandler>,
): Promise<FetchfullyConfig> {
  let c = config;
  for (const handler of stack.all()) {
    c = await handler(c);
  }
  return c;
}

export async function runResponseInterrupts<T>(
  response: FetchfullyResponse<T>,
  stack: ResponseInterruptStack,
): Promise<FetchfullyResponse<T>> {
  let r = response;
  for (const { onFulfilled, onRejected } of stack.all()) {
    if (r.isError && onRejected) {
      r = await onRejected(r);
    } else if (!r.isError && onFulfilled) {
      r = await onFulfilled(r);
    }
  }
  return r;
}
