var RiakPBC = require('riakpbc');

function Client(options) {
  Object.defineProperty(this, 'client', {
    enumerable: true,
    value: RiakPBC.createClient(options)
  });
}

/**
 * get returns a value from a bucket for a given key.
 * @method  get
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

Client.prototype.streams = {
  Get: require('./streams/get')
};

module.exports = function(options) {
  return new Client(options);
}

