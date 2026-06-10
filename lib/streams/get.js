'use strict';

const RiakStream = require('./base');

/**
 * Streams values from one or more Riak buckets for one or more keys.
 * @class Get
 * @extends RiakStream
 */
class Get extends RiakStream {
  static dimensions = ['bucket', 'key'];

  request({ bucket, key }) {
    const options = this.options;
    return this.client.get({
      bucket,
      key,
      r: options.r,
      pr: options.pr,
      basic_quorum: options.basic_quorum,
      notfound_ok: options.notfound_ok,
      if_modified: options.if_modified,
      head: options.head,
      deletedvclock: options.deletedvclock,
      timeout: options.timeout,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type
    });
  }

  transform({ bucket, key }, data) {
    return {
      bucket,
      key,
      vclock: data.vclock,
      content: data.content
    };
  }
}

/**
 * Creates a Get stream.
 * @param  {Object} options see {@link RiakStream} and {@link Get}.
 * @return {Get}
 */
module.exports = (options) => new Get(options);
module.exports.Get = Get;
