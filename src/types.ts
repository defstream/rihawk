/**
 * Shared types for rihawk.
 *
 * Riak payloads are intentionally loosely typed: the protocol-buffer
 * messages accept many optional tuning fields and return shapes that vary
 * by bucket type, so the public surface stays permissive where Riak is.
 */

/** Per-request Riak options (`r`, `w`, `timeout`, `type`, ...). */
export type RequestOptions = Record<string, unknown>;

/** Stream tuning accepted by every stream and client method. */
export interface StreamTuning {
  /** Requests issued in parallel per batch (default 1). */
  concurrent?: number;
  /** Records buffered before backpressure (object-mode default 16). */
  highWaterMark?: number;
  /** Aborting the signal destroys the stream with an AbortError. */
  signal?: AbortSignal;
}

/**
 * The subset of the no-riak client rihawk depends on. Mirrors no-riak's
 * promise-based API; tests substitute mocks that satisfy this interface.
 */
export interface RiakBackend {
  get(params: Record<string, unknown>): Promise<unknown>;
  put(params: Record<string, unknown>): Promise<unknown>;
  index(params: Record<string, unknown>): Promise<unknown>;
  dtFetch(params: Record<string, unknown>): Promise<unknown>;
  dtUpdate(params: Record<string, unknown>): Promise<unknown>;
  end(): Promise<unknown>;
}

/**
 * no-riak client construction options
 * (`connectionString`, `pool`, `retries`, `auth`, `tls`, `autoJSON`, ...).
 */
export interface ClientOptions {
  connectionString?: string;
  failoverConnectionString?: string;
  autoJSON?: boolean;
  connectionTimeout?: number;
  maxConnectionErrors?: number;
  maxConnectionErrorsPeriod?: number;
  maxConnectionLifetime?: number;
  retries?: number;
  pool?: { min?: number; max?: number };
  auth?: false | { user: string; password: string };
  tls?: Record<string, unknown>;
  [option: string]: unknown;
}

/** A single coordinate of the cartesian product a stream walks. */
export type Coordinate = Record<string, unknown>;
