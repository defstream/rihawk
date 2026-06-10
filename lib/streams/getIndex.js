'use strict';

const RiakStream = require('./base');

/**
 * Streams secondary-index matches from one or more Riak buckets for one or
 * more index/value pairs.
 * @class GetIndex
 * @extends RiakStream
 */
class GetIndex extends RiakStream {
  static dimensions = ['bucket', 'index', 'value'];

  request({ bucket, index, value }) {
    const options = this.options;
    return this.client.index({
      bucket,
      index,
      key: value,
      qtype: 0,
      return_terms: options.return_terms ?? true,
      max_results: options.max_results,
      continuation: options.continuation,
      timeout: options.timeout,
      type: options.type,
      term_regex: options.term_regex,
      pagination_sort: options.pagination_sort
    });
  }

  transform({ bucket, index, value }, data) {
    return {
      bucket,
      index,
      value,
      keys: data.results,
      continuation: data.continuation
    };
  }
}

/**
 * Creates a GetIndex stream.
 * @param  {Object} options see {@link RiakStream} and {@link GetIndex}.
 * @return {GetIndex}
 */
module.exports = (options) => new GetIndex(options);
module.exports.GetIndex = GetIndex;
