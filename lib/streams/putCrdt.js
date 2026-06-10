'use strict';

const RiakStream = require('./base');

/**
 * Streams CRDT operations into one or more Riak buckets for one or more keys.
 * @class PutCrdt
 * @extends RiakStream
 */
class PutCrdt extends RiakStream {
  static dimensions = ['bucket', 'key', 'op'];

  request({ bucket, key, op }) {
    const options = this.options;
    return this.client.dtUpdate({
      bucket,
      key,
      op,
      context: options.context,
      include_context: options.include_context,
      return_body: options.return_body ?? true,
      w: options.w,
      dw: options.dw,
      pw: options.pw,
      timeout: options.timeout,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type || 'default'
    });
  }

  transform({ bucket, key }, data) {
    return {
      bucket,
      key: data.key || key,
      context: data.context,
      counter_value: data.counter_value,
      set_value: data.set_value,
      map_value: data.map_value,
      value: data.counter_value || data.map_value || data.set_value
    };
  }
}

/**
 * Creates a PutCrdt stream.
 * @param  {Object} options see {@link RiakStream} and {@link PutCrdt}.
 * @return {PutCrdt}
 */
module.exports = (options) => new PutCrdt(options);
module.exports.PutCrdt = PutCrdt;
