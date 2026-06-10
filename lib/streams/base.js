'use strict';

const { Readable } = require('node:stream');

/**
 * Base class for rihawk request streams.
 *
 * A subclass declares its iterable dimensions (for example `bucket` × `key`)
 * via `static dimensions`, and implements `request()` and `transform()`.
 * The base class walks the cartesian product of every dimension's values —
 * last dimension fastest — issuing up to `concurrent` client requests per
 * read and pushing one transformed record downstream per response.
 *
 * Errors from individual requests are re-emitted as `'error'` events but do
 * not end the stream; remaining combinations are still fetched.
 * @class RiakStream
 * @extends Readable
 */
class RiakStream extends Readable {
  /** Cursor into the cartesian product, one index per dimension. */
  #positions;
  /** Responses fetched but not yet pushed downstream. */
  #buffer = [];
  /** Set once every combination has been visited. */
  #exhausted = false;
  /** Set when required options were missing and the stream is being destroyed. */
  #invalid = false;

  /**
   * Names of the option properties this stream iterates over. Each is
   * accepted as a single value or an array of values.
   * @type {string[]}
   */
  static dimensions = [];

  /**
   * @param {Object} options
   * @param {Object} options.client      a riakpbc client instance.
   * @param {Object} [options.options]   per-request riakpbc options.
   * @param {number} [options.concurrent=1] requests issued in parallel per read.
   */
  constructor(options = {}) {
    super({ objectMode: true });

    const { dimensions } = this.constructor;
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

    this.client = options.client;
    this.options = options.options || {};
    this.concurrent = options.concurrent || 1;

    for (const name of dimensions) {
      this[name] = [].concat(options[name]);
    }

    this.#positions = dimensions.map(() => 0);
    this.#positions[dimensions.length - 1] = -1;
  }

  /**
   * Advances the cursor and returns the next coordinate of the cartesian
   * product, or `null` once every combination has been visited.
   * @return {?Object} map of dimension name to current value.
   */
  #advance() {
    if (this.#exhausted) {
      return null;
    }
    const { dimensions } = this.constructor;
    for (let d = dimensions.length - 1; d >= 0; d--) {
      this.#positions[d] += 1;
      if (this.#positions[d] < this[dimensions[d]].length) {
        return Object.fromEntries(
          dimensions.map((name, i) => [name, this[name][this.#positions[i]]])
        );
      }
      this.#positions[d] = 0;
    }
    this.#exhausted = true;
    return null;
  }

  /**
   * Returns the next batch of coordinates to request.
   * @param  {number} [limit] batch size; defaults to `concurrent`.
   * @return {?Object[]} the batch, or `null` when the product is exhausted.
   */
  next(limit = this.concurrent) {
    const batch = [];
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
   * Pushes buffered responses, or fetches the next batch.
   * @return {undefined}
   */
  _read() {
    if (this.#invalid) {
      return;
    }
    if (this.#buffer.length > 0) {
      this.push(this.#buffer.shift());
      return;
    }
    const batch = this.next();
    if (!batch) {
      this.push(null);
      return;
    }
    this.#fetch(batch);
  }

  /**
   * Issues one client request per coordinate, buffers the responses, and
   * pushes the first one. Empty batches (for example not-found keys) recurse
   * into `_read` so the stream keeps making progress.
   * @param {Object[]} batch coordinates returned by `next()`.
   */
  #fetch(batch) {
    const results = [];
    const requests = batch.map(
      (current) =>
        new Promise((resolve) => {
          this.request(current)
            .on('data', (data) => results.push(this.transform(current, data)))
            .on('error', (error) => {
              this.emit('error', error);
              resolve();
            })
            .on('end', resolve);
        })
    );

    Promise.all(requests).then(() => {
      if (results.length === 0) {
        this._read();
        return;
      }
      this.#buffer.push(...results);
      this.push(this.#buffer.shift());
    });
  }

  /**
   * Issues a single client request for the given coordinate.
   * @abstract
   * @param  {Object} current map of dimension name to value.
   * @return {Readable} the riakpbc response stream.
   */
  request(current) {
    throw new Error(`#${this.constructor.name}: request() is not implemented.`);
  }

  /**
   * Shapes a single client response into the record emitted downstream.
   * @abstract
   * @param  {Object} current map of dimension name to value.
   * @param  {Object} data    a single riakpbc response.
   * @return {Object} the record to emit.
   */
  transform(current, data) {
    throw new Error(`#${this.constructor.name}: transform() is not implemented.`);
  }
}

module.exports = RiakStream;
