'use strict';

var util = require('util');
var async = require('neo-async');
var Readable = require('stream').Readable;

util.inherits(Get, Readable);

/**
 * Gets values from a Riak bucket by keyname.
 * @class Get
 * @param {Object} options The options for this get request
 */
function Get(options) {
  if (optionsAreMissing('get', options, ['client', 'bucket', 'key'], this))
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
Get.prototype.next = function(limit) {
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


Get.prototype._read = function() {
  var self = this;
  if (self.paused) {
    return;
  }
  var results = [];
  var set = self.next(); // returns multiple
  if (!set) {
    return self.push(null);
  }
  async.each(set, function(current, done) {
    if (current) {
      self.client.get({
        bucket: current.bucket,
        key: current.key
      }).on('data', function(data) {
        results.push({
          bucket: current.bucket,
          key: current.key,
          vclock: data.vclock,
          content: data.content
        });
      }).on('error', function(err) {
        self.emit('error', err);
      }).on('end', function() {
        done();
      });
    } else {
      done();
    }
  },
  function(err) {
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

function optionsAreMissing(method, options, keys, stream) {
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!options || !options[key]) {
      stream.emit('error', new Error('#' + method + ': options.' + key + ' was not provided.'));
      stream.push(null);
      return true;
    }
  }
  return false;
}

module.exports = function(options) {
  return new Get(options);
};
