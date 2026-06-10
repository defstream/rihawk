import { Readable } from 'node:stream';

import type { Coordinate, RequestOptions, RiakBackend, StreamTuning } from '../types';

/** Options accepted by every rihawk stream. */
export interface RiakStreamOptions extends StreamTuning {
  /** A no-riak client (or any object satisfying RiakBackend). */
  client: RiakBackend;
  /** Per-request Riak options. */
  options?: RequestOptions;
  /** Dimension values (`bucket`, `key`, ...) declared by the subclass. */
  [dimension: string]: unknown;
}

/**
 * Base class for rihawk request streams.
 *
 * A subclass declares its iterable dimensions (for example `bucket` × `key`)
 * via `static dimensions`, and implements `request()` and `transform()`.
 * The base class walks the cartesian product of every dimension's values —
 * last dimension fastest — issuing up to `concurrent` client requests per
 * batch and pushing one transformed record downstream per response. While
 * the consumer drains buffered records, the next batch is prefetched so
 * round-trip latency overlaps with processing.
 *
 * Errors from individual requests are re-emitted as `'error'` events with
 * the failing coordinate assigned onto the error (`error.bucket`,
 * `error.key`, ...) and do not end the stream; remaining combinations are
 * still fetched.
 */
export abstract class RiakStream extends Readable {
  /** Cursor into the cartesian product, one index per dimension. */
  #positions: number[] = [];
  /** Responses fetched but not yet pushed downstream. */
  #buffer: Coordinate[] = [];
  /** Set once every combination has been visited. */
  #exhausted = false;
  /** Set when required options were missing and the stream is being destroyed. */
  #invalid = false;
  /** Set while a batch of requests is in flight. */
  #fetching = false;
  /** Set when `_read` found the buffer empty and a push is owed. */
  #pendingRead = false;

  /**
   * Names of the option properties this stream iterates over. Each is
   * accepted as a single value or an array of values.
   */
  static dimensions: readonly string[] = [];

  declare client: RiakBackend;
  declare options: RequestOptions;
  declare concurrent: number;

  constructor(options: Partial<RiakStreamOptions> = {}) {
    super({
      objectMode: true,
      highWaterMark: options.highWaterMark,
      signal: options.signal
    });

    const { dimensions } = this.constructor as typeof RiakStream;
    const missing = ['client', ...dimensions].find(
      (name) => options[name] === undefined || options[name] === null
    );

    if (missing) {
      this.#invalid = true;
      process.nextTick(() => {
        this.destroy(new Error(`#${this.constructor.name}: options.${missing} was not provided.`));
      });
      return;
    }

    this.client = options.client as RiakBackend;
    this.options = options.options || {};
    this.concurrent = options.concurrent || 1;

    const self = this as unknown as Record<string, unknown[]>;
    for (const name of dimensions) {
      self[name] = ([] as unknown[]).concat(options[name]);
    }

    this.#positions = dimensions.map(() => 0);
    this.#positions[dimensions.length - 1] = -1;
  }

  /** The values of one dimension, normalized to an array at construction. */
  #values(name: string): unknown[] {
    return (this as unknown as Record<string, unknown[]>)[name];
  }

  /**
   * Advances the cursor and returns the next coordinate of the cartesian
   * product, or `null` once every combination has been visited.
   */
  #advance(): Coordinate | null {
    if (this.#exhausted) {
      return null;
    }
    const { dimensions } = this.constructor as typeof RiakStream;
    for (let d = dimensions.length - 1; d >= 0; d--) {
      this.#positions[d] += 1;
      if (this.#positions[d] < this.#values(dimensions[d]).length) {
        return Object.fromEntries(
          dimensions.map((name, i) => [name, this.#values(name)[this.#positions[i]]])
        );
      }
      this.#positions[d] = 0;
    }
    this.#exhausted = true;
    return null;
  }

  /**
   * Returns the next batch of coordinates to request, or `null` when the
   * product is exhausted.
   * @param limit batch size; defaults to `concurrent`.
   */
  next(limit: number = this.concurrent): Coordinate[] | null {
    const batch: Coordinate[] = [];
    for (let i = 0; i < limit; i++) {
      const current = this.#advance();
      if (!current) {
        break;
      }
      batch.push(current);
    }
    return batch.length > 0 ? batch : null;
  }

  /**
   * Pushes a buffered record if one is available, then keeps the fetch
   * pipeline primed.
   */
  override _read(): void {
    if (this.#invalid) {
      return;
    }
    if (this.#buffer.length > 0) {
      this.push(this.#buffer.shift());
    } else {
      this.#pendingRead = true;
    }
    this.#fetch();
  }

  /**
   * Drops buffered records when the stream is destroyed or aborted.
   * In-flight requests resolve but their results are discarded.
   */
  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.#buffer.length = 0;
    callback(error);
  }

  /**
   * Issues one client request per coordinate of the next batch and buffers
   * the responses. Satisfies a pending read as soon as a record is
   * available, ends the stream once the product is exhausted, and prefetches
   * one batch ahead of demand.
   */
  #fetch(): void {
    if (this.#fetching || this.#invalid || this.destroyed) {
      return;
    }
    const batch = this.next();
    if (!batch) {
      if (this.#pendingRead && this.#buffer.length === 0) {
        this.#pendingRead = false;
        this.push(null);
      }
      return;
    }

    this.#fetching = true;
    const results: Coordinate[] = [];
    const requests = batch.map((current) =>
      Promise.resolve()
        .then(() => this.request(current))
        .then((response) => {
          const records =
            response === undefined || response === null
              ? []
              : ([] as unknown[]).concat(response);
          for (const data of records) {
            results.push(this.transform(current, data));
          }
        })
        .catch((error: Error) => {
          if (!this.destroyed) {
            this.emit('error', Object.assign(error, current));
          }
        })
    );

    void Promise.all(requests).then(() => {
      this.#fetching = false;
      if (this.destroyed) {
        return;
      }
      this.#buffer.push(...results);
      if (this.#pendingRead && this.#buffer.length > 0) {
        this.#pendingRead = false;
        this.push(this.#buffer.shift());
      }
      if (this.#pendingRead || this.#buffer.length === 0) {
        this.#fetch();
      }
    });
  }

  /**
   * Issues a single client request for the given coordinate. Resolving to
   * `null` or `undefined` emits nothing (not found); resolving to an array
   * emits one record per element.
   */
  abstract request(current: Coordinate): Promise<unknown>;

  /** Shapes a single client response into the record emitted downstream. */
  abstract transform(current: Coordinate, data: unknown): Coordinate;
}
