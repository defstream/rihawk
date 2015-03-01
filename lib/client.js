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
   * @param  {String} bucket  the bucket to query.
   * @param  {String} key     the key to return a value for.
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
 * @param  {String} bucket A string, or an array of strings containing the bucket to query.
 * @param  {String} index A string, or an array of strings containing index to query values for.
 * @param  {String} value   A string or an array of strings containg values the index must match.
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
 * @method put
 * @param  {String} bucket  A string or an array of strings for each bucket to place a value for.
 * @param  {String} key     A string or an array of string for each key.
 * @param  {String} value    A string or an array of string for each.
 * @param  {Object} options riakpbc options.
 * @return {Stream} response stream.
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
 * Puts the CRDT into the bucket for the given key.
 * @method  putCrdt
 * @param  {String} bucket  A string or an array of strings for each bucket to place a value for.
 * @param  {String} key     A string or an array of string for each key.
 * @param  {Object} op An object or an array of array of objects for each CRDT to update.
 * @param  {Object} options riakpbc options.
 * @return {Stream} response stream.
 */
Client.prototype.putCrdt = function(bucket, key, op, options) {
  return this.streams.PutCrdt({
    client: this.client,
    bucket: bucket,
    key: key,
    op: op,
    options: options
  });
};
/**
 * Returns a CRDT from a bucket for a given key.
 * @method getCrdt
 * @param  {String} bucket  the bucket to query.
 * @param  {String} key     the key to return a CRDT for.
 * @param  {Object} options riakpbc options.
 * @return {Stream} response streams.
 */
Client.prototype.getCrdt = function(bucket, key, options) {
  return this.streams.GetCrdt({
    client: this.client,
    options: options,
    bucket: bucket,
    key: key
  });
};
/**
 * Updates a counter for a bucket for a given key.c
 * @method updateCounter
 * @param  {String} bucket  the bucket to query.
 * @param  {String} key     the key to update a counter for.
 * @param  {String} Number     the negative or positve value to apply to the counter.
 * @param  {Object} options riakpbc options.
 * @return {Stream} response stream.
 */
Client.prototype.updateCounter = function(bucket, key, value, options) {
  return this.streams.PutCrdt({
    client: this.client,
    bucket: bucket,
    key: key,
    op: {
      counter_op: {
        increment: value
      }
    },
    options: options
  });
};
/**
 * Returns a counter for a bucket from a given key.
 * @method getCounter
 * @param  {String} bucket  the bucket to query.
 * @param  {String} key     the key to return a counter for.
 * @param  {Object} options riakpbc options.
 * @return {Stream} response stream.
 */
Client.prototype.getCounter = Client.prototype.getCrdt;

/**
 * All Riak API / Stream Interfaces.
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
 * exports the client
 * @param {Object} options RiakPBC options.
 * @return {Client}
 */
module.exports = function(options) {
  return new Client(options);
};
