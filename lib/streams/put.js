'use strict';

const RiakStream = require('./base');

/**
 * Streams values into one or more Riak buckets for one or more keys.
 * Values are serialized as JSON.
 * @class Put
 * @extends RiakStream
 */
class Put extends RiakStream {
  static dimensions = ['bucket', 'key', 'value'];

  request({ bucket, key, value }) {
    const options = this.options;
    return this.client.put({
      bucket,
      key,
      return_body: options.return_body ?? true,
      vclock: options.vclock,
      w: options.w,
      dw: options.dw,
      pw: options.pw,
      if_not_modified: options.if_not_modified,
      if_none_match: options.if_none_match,
      return_head: options.return_head,
      timeout: options.timeout,
      asis: options.asis,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type,
      content: {
        value: JSON.stringify(value),
        content_type: 'application/json',
        indexes: options.indexes
      }
    });
  }

  transform({ bucket, key }, data) {
    return {
      bucket,
      key: data.key || key,
      vclock: data.vclock,
      content: data.content
    };
  }
}

/**
 * Creates a Put stream.
 * @param  {Object} options see {@link RiakStream} and {@link Put}.
 * @return {Put}
 */
module.exports = (options) => new Put(options);
module.exports.Put = Put;
