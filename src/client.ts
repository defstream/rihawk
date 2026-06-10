import { Client as NoRiakClient } from 'no-riak';

import createGet from './streams/get';
import createGetCrdt from './streams/getCrdt';
import createGetIndex from './streams/getIndex';
import createPut from './streams/put';
import createPutCrdt from './streams/putCrdt';
import type { ClientOptions, RequestOptions, RiakBackend, StreamTuning } from './types';

type Streamable = string | readonly string[];

/** The stream factories backing each client method. */
interface StreamFactories {
  Get: typeof createGet;
  GetCrdt: typeof createGetCrdt;
  GetIndex: typeof createGetIndex;
  Put: typeof createPut;
  PutCrdt: typeof createPutCrdt;
}

/**
 * A streaming Riak client. Every method accepts single values or arrays for
 * its bucket/key style parameters and returns an object-mode readable stream
 * that emits one record per response across the full combination of inputs.
 */
class Client {
  /** The underlying no-riak client, for operations rihawk does not wrap. */
  client: RiakBackend;

  /** All Riak API / stream factories. Shared via the prototype. */
  declare streams: StreamFactories;

  /** Returns counter(s) from bucket(s) for the given key(s). Alias of getCrdt. */
  declare getCounter: Client['getCrdt'];

  /**
   * @param options no-riak client options
   *                (connectionString, pool, retries, auth, tls, ...).
   */
  constructor(options?: ClientOptions) {
    this.client = new NoRiakClient(options);
  }

  /** Closes the underlying connection pool. */
  end(): Promise<unknown> {
    return this.client.end();
  }

  /**
   * Returns values from one or more buckets for one or more keys. Emits
   * `{bucket, key, vclock, content}`; keys that are not found are skipped.
   * @param bucket  bucket(s) to query.
   * @param key     key(s) to return values for.
   * @param options Riak request options.
   * @param streamOptions stream tuning: `concurrent`, `highWaterMark`, `signal`.
   */
  get(bucket: Streamable, key: Streamable, options?: RequestOptions, streamOptions?: StreamTuning) {
    return this.streams.Get({ client: this.client, bucket, key, options, ...streamOptions });
  }

  /**
   * Returns all keys matching the index value(s) for the given bucket(s).
   * Emits `{bucket, index, value, keys, continuation}`.
   * @param bucket  bucket(s) to query.
   * @param index   secondary index(es) to query.
   * @param value   value(s) the index must match.
   * @param options Riak request options (`max_results`, `continuation`, ...).
   * @param streamOptions stream tuning: `concurrent`, `highWaterMark`, `signal`.
   */
  getIndex(
    bucket: Streamable,
    index: Streamable,
    value: Streamable,
    options?: RequestOptions,
    streamOptions?: StreamTuning
  ) {
    return this.streams.GetIndex({ client: this.client, bucket, index, value, options, ...streamOptions });
  }

  /**
   * Puts value(s) into bucket(s) for the given key(s). Values are stored as
   * JSON unless `options.content_type` is set, in which case they are stored
   * as given. Emits `{bucket, key, vclock, content}`.
   * @param bucket  bucket(s) to write to.
   * @param key     key(s) to write.
   * @param value   value(s) to store.
   * @param options Riak request options (`content_type`, `indexes`, ...).
   * @param streamOptions stream tuning: `concurrent`, `highWaterMark`, `signal`.
   */
  put(
    bucket: Streamable,
    key: Streamable,
    value: unknown,
    options?: RequestOptions,
    streamOptions?: StreamTuning
  ) {
    return this.streams.Put({ client: this.client, bucket, key, value, options, ...streamOptions });
  }

  /**
   * Applies CRDT operation(s) to bucket(s) for the given key(s).
   * Emits `{bucket, key, context, counter_value, set_value, map_value, value}`.
   * @param bucket  bucket(s) to write to.
   * @param key     key(s) to write.
   * @param op      CRDT operation(s) to apply (`counter_op`, `set_op`, `map_op`).
   * @param options Riak request options (`type` is the bucket type, default `'default'`).
   * @param streamOptions stream tuning: `concurrent`, `highWaterMark`, `signal`.
   */
  putCrdt(
    bucket: Streamable,
    key: Streamable,
    op: unknown,
    options?: RequestOptions,
    streamOptions?: StreamTuning
  ) {
    return this.streams.PutCrdt({ client: this.client, bucket, key, op, options, ...streamOptions });
  }

  /**
   * Returns CRDT(s) from bucket(s) for the given key(s).
   * Emits `{bucket, key, context, type, value}`.
   * @param bucket  bucket(s) to query.
   * @param key     key(s) to return CRDTs for.
   * @param options Riak request options (`type` is the bucket type, default `'default'`).
   * @param streamOptions stream tuning: `concurrent`, `highWaterMark`, `signal`.
   */
  getCrdt(bucket: Streamable, key: Streamable, options?: RequestOptions, streamOptions?: StreamTuning) {
    return this.streams.GetCrdt({ client: this.client, bucket, key, options, ...streamOptions });
  }

  /**
   * Increments (or, with a negative value, decrements) counter(s).
   * @param bucket  bucket(s) to update.
   * @param key     counter key(s) to update.
   * @param value   amount to apply to the counter.
   * @param options Riak request options (`type` is the bucket type).
   * @param streamOptions stream tuning: `concurrent`, `highWaterMark`, `signal`.
   */
  updateCounter(
    bucket: Streamable,
    key: Streamable,
    value: number,
    options?: RequestOptions,
    streamOptions?: StreamTuning
  ) {
    return this.putCrdt(bucket, key, { counter_op: { increment: value } }, options, streamOptions);
  }
}

Client.prototype.streams = {
  Get: createGet,
  GetCrdt: createGetCrdt,
  GetIndex: createGetIndex,
  Put: createPut,
  PutCrdt: createPutCrdt
};

// eslint-disable-next-line @typescript-eslint/unbound-method -- intentional prototype alias; `this` binds at call time
Client.prototype.getCounter = Client.prototype.getCrdt;

interface CreateClient {
  /** Creates a new Client. Works with or without `new`. */
  (options?: ClientOptions): Client;
  new (options?: ClientOptions): Client;
  Client: typeof Client;
}

const createClient = function createClient(options?: ClientOptions): Client {
  return new Client(options);
} as unknown as CreateClient;
createClient.Client = Client;

export = createClient;
