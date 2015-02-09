var RiakPBC = require('riakpbc');
/**
 * A Streaming Riak Client with advanced features...
 * @param {Object} options RiakPBC options.
 */
function Client(options) {
  Object.defineProperty(this, 'client', {
    enumerable: true,
    value: RiakPBC.createClient(options)
  });
}
/**
 * Returns a value from a bucket for a given key.
 * @method get
 * @param  {String} bucket  the bucket to query
 * @param  {String} key     the key to return a value for.
 * @param  {Object} options riakpbc options
 * @return {Stream} response streams.
 */
Client.prototype.get = function(bucket, key, options) {
  return this.streams.Get({
    client: this.client,
    options: options,
    bucket: bucket,
    key: key
  });
};
/**
 * All Riak API / Stream Interfaces.
 * @type {Object}
 */
Client.prototype.streams = {
  Get: require('./streams/get')
};
/**
 * exports the client
 * @param {Object} options RiakPBC options.
 * @return {Client}
 */
module.exports = function(options) {
  return new Client(options);
};
