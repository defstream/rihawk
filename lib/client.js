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
 * @param  {String, [String]} bucket  the bucket to query.
 * @param  {String, [String]} key     the key to return a value for.
 * @param  {Object} options riakpbc options.
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
 * Returns all values matching the index value for the specified bucket.
 * @method getIndex
 * @param  {String,[String]} bucket A string, or an array of strings containing the bucket to query.
 * @param  {String,[String]} index A string, or an array of strings containing index to query values for.
 * @param  {String,[String]} value   A string or an array of strings containg values the index must match.
 * @param  {Object} options riakpbc options.
 * @return {Stream} response stream.
 */
Client.prototype.getIndex = function(bucket, index, value, options) {
  return this.streams.GetIndex({
    client: this.client,
    options: options,
    bucket: bucket,
    index: index,
    value: value
  });
};

/**
 * Puts the value into the bucket for the given key.
 * @param  {String/[String]} bucket  A string or an array of strings for each bucket to place a value for.
 * @param  {String} key     A string or an array of string for each key.
 * @param  {[type]} value    A string or an array of string for each.
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
Client.prototype.put = function(bucket, key, value, options) {
  return this.streams.Put({
    client: this.client,    
    bucket: bucket,
    key: key,
    value: value,
    options: options
  });
};

/**
 * All Riak API / Stream Interfaces.
 * @type {Object}
 */
Client.prototype.streams = {
  Get: require('./streams/get'),
  GetIndex: require('./streams/getIndex'),
  Put : require('./streams/put')
};
/**
 * exports the client
 * @param {Object} options RiakPBC options.
 * @return {Client}
 */
module.exports = function(options) {
  return new Client(options);
};
