import type { Readable } from 'node:stream';

export interface MockCall {
  method: string;
  request: Record<string, any>;
}

/**
 * Maps (method, request) to a response object, an Error (the call rejects),
 * or null/undefined (a not-found response).
 */
export type Responder = (method: string, request: Record<string, any>) => unknown;

export interface MockClient {
  calls: MockCall[];
  get(request: Record<string, unknown>): Promise<unknown>;
  put(request: Record<string, unknown>): Promise<unknown>;
  index(request: Record<string, unknown>): Promise<unknown>;
  dtFetch(request: Record<string, unknown>): Promise<unknown>;
  dtUpdate(request: Record<string, unknown>): Promise<unknown>;
  end(): Promise<unknown>;
}

/**
 * Builds a fake no-riak client. Every method records its calls and resolves
 * to whatever `respond(method, request)` returns.
 */
export function mockClient(respond: Responder = () => null): MockClient {
  const calls: MockCall[] = [];
  const handler =
    (method: string) =>
    (request: Record<string, any> = {}): Promise<unknown> => {
      calls.push({ method, request });
      const response = respond(method, request);
      if (response instanceof Error) {
        return Promise.reject(response);
      }
      return Promise.resolve(response);
    };
  return {
    calls,
    get: handler('get'),
    put: handler('put'),
    index: handler('index'),
    dtFetch: handler('dtFetch'),
    dtUpdate: handler('dtUpdate'),
    end: handler('end')
  };
}

export interface Collected {
  data: Record<string, any>[];
  errors: (Error & Record<string, any>)[];
}

/**
 * Consumes a stream, collecting 'data' and 'error' events until it ends or
 * closes.
 */
export function collect(stream: Readable): Promise<Collected> {
  return new Promise((resolve) => {
    const data: Collected['data'] = [];
    const errors: Collected['errors'] = [];
    stream
      .on('data', (record) => data.push(record))
      .on('error', (error) => errors.push(error))
      .on('end', () => resolve({ data, errors }))
      .on('close', () => resolve({ data, errors }));
  });
}
