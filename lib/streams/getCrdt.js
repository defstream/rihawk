'use strict';

const RiakStream = require('./base');

/**
 * Streams CRDTs from one or more Riak buckets for one or more keys.
 * @class GetCrdt
 * @extends RiakStream
 */
class GetCrdt extends RiakStream {
  static dimensions = ['bucket', 'key'];

  request({ bucket, key }) {
    const options = this.options;
    return this.client.dtFetch({
      bucket,
      key,
      r: options.r,
      pr: options.pr,
      basic_quorum: options.basic_quorum,
      notfound_ok: options.notfound_ok,
      timeout: options.timeout,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type || 'default',
      include_context: options.include_context
    });
  }

  transform({ bucket, key }, data) {
    return {
      bucket,
      key,
      context: data.context,
      type: data.type,
      value: data.value
    };
  }
}

/**
 * Creates a GetCrdt stream.
 * @param  {Object} options see {@link RiakStream} and {@link GetCrdt}.
 * @return {GetCrdt}
 */
module.exports = (options) => new GetCrdt(options);
module.exports.GetCrdt = GetCrdt;
