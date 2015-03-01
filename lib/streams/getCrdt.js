'use strict';

var util = require('util');
var async = require('neo-async');
var missing = require('../missing');
var Readable = require('stream').Readable;

util.inherits(GetCrdt, Readable);

/**
 * GetCrdts values from a Riak bucket by keyname.
 * @class GetCrdt
 * @param {Object} options The options for this GetCrdt request
 */
function GetCrdt(options) {
    if (missing.options(options, ['client', 'bucket', 'key'], this))
      return;

    options.objectMode = true;

    Readable.call(this, options);

    Object.defineProperty(this, 'client', {
      enumerable: true,
      value: options.client
    });

    Object.defineProperty(this, 'bucket', {
      enumerable: true,
      value: [].concat(options.bucket)
    });

    Object.defineProperty(this, 'key', {
      enumerable: true,
      value: [].concat(options.key)
    });

    Object.defineProperty(this, 'options', {
      enumerable: true,
      value: options.options || Object.create(null)
    });

    Object.defineProperty(this, 'concurrent', {
      enumerable: true,
      value: options.concurrent || 1
    });

    Object.defineProperty(this, 'endOnError', {
      value: false
    });

    Object.defineProperty(this, 'currentBucket', {
      writable: true,
      value: 0
    });

    Object.defineProperty(this, 'currentKey', {
      writable: true,
      value: -1
    });

    Object.defineProperty(this, 'paused', {
      writable: true,
      value: false
    });

    (function(self) {
      self.on('pause', function() {
        self.paused = true;
      });

      self.on('resume', function() {
        self.paused = false;
        self._read();
      });
    })(this);

  }
  /**
   * returns the next data available for writting
   * @param  {Number}  limit How many items to return
   * @return {Array}
   */
GetCrdt.prototype.next = function(limit) {
  var self = this;
  var results = [];
  for (var i = 0; i < (limit || self.concurrent || 1); i++) {
    if (++self.currentKey >= self.key.length) {
      if (++self.currentBucket >= self.bucket.length) {
        return null;
      } else {
        self.currentKey = 0;
      }
    }
    results.push({
      bucket: self.bucket[self.currentBucket],
      key: self.key[self.currentKey]
    });
  }
  return results;
};
/**
 * GetCrdts the next set of data to read and requests it from the client.
 * @return {undefined}
 */
GetCrdt.prototype._read = function() {
  var self = this;
  if (self.paused) {
    return;
  }
  var results = [];
  var set = self.next(); // returns multiple
  if (!set) {
    self.push(null);
    return;
  }
  async.each(set, function(current, done) {
    if (current) {
      self.client.getCrdt({
        bucket: current.bucket,
        key: current.key,
        r: self.options.r,
        pr: self.options.pr,
        basic_quorum: self.options.basic_quorum,
        notfound_ok: self.options.notfound_ok,
        timeout: self.options.timeout,
        sloppy_quorum: self.options.sloppy_quorum,
        n_val: self.options.n_val,
        type: self.options.type,
        include_context: self.options.include_context
      }).on('data', function(data) {
        results.push({
          bucket: current.bucket,
          key: current.key,
          context: data.context,
          type: data.type,
          value: data.value
        });
      }).on('error', function(err) {
        self.emit('error', err);
      }).on('end', function() {
        done();
      });
    } else {
      done();
    }
  }, function(err) {
    if (err) {
      self.emit('error', err);
    } else if (!results.length) {
      self._read();
    } else {
      results.forEach(function(result) {
        self.push(result);
      });
    }
  });
};
/** exports the GetCrdt stream @params options*/
module.exports = function(options) {
  return new GetCrdt(options);
};
