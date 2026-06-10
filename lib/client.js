'use strict';

const NoRiak = require('no-riak');

/**
 * A streaming Riak client. Every method accepts single values or arrays for
 * its bucket/key style parameters and returns an object-mode readable stream
 * that emits one record per response across the full combination of inputs.
 * @class Client
 */
class Client {
  /**
   * @param {Object} [options] no-riak client options
   *                           (connectionString, pool, retries, auth, tls, ...).
   */
  constructor(options) {
    this.client = new NoRiak.Client(options);
  }

  /**
   * Closes the underlying connection pool.
   * @return {Promise}
   */
  end() {
    return this.client.end();
  }

  /**
   * Returns values from one or more buckets for one or more keys.
   * @param  {(string|string[])} bucket  bucket(s) to query.
   * @param  {(string|string[])} key     key(s) to return values for.
   * @param  {Object} [options] Riak request options.
   * @return {Readable} object-mode stream of `{bucket, key, vclock, content}`.
   */
  get(bucket, key, options) {
    return this.streams.Get({ client: this.client, bucket, key, options });
  }

  /**
   * Returns all values matching the index value(s) for the given bucket(s).
   * @param  {(string|string[])} bucket  bucket(s) to query.
   * @param  {(string|string[])} index   secondary index(es) to query.
   * @param  {(string|string[])} value   value(s) the index must match.
   * @param  {Object} [options] Riak request options.
   * @return {Readable} object-mode stream of `{bucket, index, value, keys}`.
   */
  getIndex(bucket, index, value, options) {
    return this.streams.GetIndex({ client: this.client, bucket, index, value, options });
  }

  /**
   * Puts value(s) into bucket(s) for the given key(s). Values are stored as
   * JSON.
   * @param  {(string|string[])} bucket  bucket(s) to write to.
   * @param  {(string|string[])} key     key(s) to write.
   * @param  {*} value  value(s) to store.
   * @param  {Object} [options] Riak request options.
   * @return {Readable} object-mode stream of `{bucket, key, vclock, content}`.
   */
  put(bucket, key, value, options) {
    return this.streams.Put({ client: this.client, bucket, key, value, options });
  }

  /**
   * Applies CRDT operation(s) to bucket(s) for the given key(s).
   * @param  {(string|string[])} bucket  bucket(s) to write to.
   * @param  {(string|string[])} key     key(s) to write.
   * @param  {(Object|Object[])} op      CRDT operation(s) to apply.
   * @param  {Object} [options] Riak request options (`type` is the bucket type).
   * @return {Readable} object-mode stream of CRDT results.
   */
  putCrdt(bucket, key, op, options) {
    return this.streams.PutCrdt({ client: this.client, bucket, key, op, options });
  }

  /**
   * Returns CRDT(s) from bucket(s) for the given key(s).
   * @param  {(string|string[])} bucket  bucket(s) to query.
   * @param  {(string|string[])} key     key(s) to return CRDTs for.
   * @param  {Object} [options] Riak request options (`type` is the bucket type).
   * @return {Readable} object-mode stream of `{bucket, key, context, type, value}`.
   */
  getCrdt(bucket, key, options) {
    return this.streams.GetCrdt({ client: this.client, bucket, key, options });
  }

  /**
   * Increments (or, with a negative value, decrements) counter(s).
   * @param  {(string|string[])} bucket  bucket(s) to update.
   * @param  {(string|string[])} key     counter key(s) to update.
   * @param  {number} value  amount to apply to the counter.
   * @param  {Object} [options] Riak request options (`type` is the bucket type).
   * @return {Readable} object-mode stream of CRDT results.
   */
  updateCounter(bucket, key, value, options) {
    return this.putCrdt(bucket, key, { counter_op: { increment: value } }, options);
  }
}

/**
 * Returns counter(s) from bucket(s) for the given key(s).
 * Alias of {@link Client#getCrdt}.
 * @method getCounter
 */
Client.prototype.getCounter = Client.prototype.getCrdt;

/**
 * All Riak API / stream factories.
 * @type {Object}
 */
Client.prototype.streams = {
  Get: require('./streams/get'),
  GetCrdt: require('./streams/getCrdt'),
  GetIndex: require('./streams/getIndex'),
  Put: require('./streams/put'),
  PutCrdt: require('./streams/putCrdt')
};

/**
 * Creates a new Client. Works with or without `new`.
 * @param  {Object} [options] no-riak client options.
 * @return {Client}
 */
module.exports = function createClient(options) {
  return new Client(options);
};
module.exports.Client = Client;
