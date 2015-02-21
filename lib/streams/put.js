'use strict';

var util = require('util');
var async = require('neo-async');
var missing = require('../missing');
var Readable = require('stream').Readable;

util.inherits(Put, Readable);

function Put(options) {
    if (missing.options(options, ['client', 'bucket', 'key', 'value'], this))
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

    Object.defineProperty(this, 'value', {
      enumerable: true,
      value: [].concat(options.value)
    });

    Object.defineProperty(this, 'options', {
      enumerable: true,
      value: options.options || Object.create(null)
    });

    Object.defineProperty(this, 'concurrent', {
      enumerable: true,
      value: options.concurrent || 1
    });

    Object.defineProperty(this, 'currentBucket', {
      writable: true,
      value: 0
    });

    Object.defineProperty(this, 'currentKey', {
      writable: true,
      value: 0
    });

    Object.defineProperty(this, 'currentValue', {
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
Put.prototype.next = function(limit) {
  var self = this;
  var results = [];
  for (var i = 0; i < (limit || self.concurrent || 1); i++) {
    if (++self.currentValue >= self.value.length) {
      if (++self.currentKey >= self.key.length) {
        if (++self.currentBucket >= self.bucket.length) {
          return null;
        } else {
          self.currentKey = 0;
        }
      }
    }
    results.push({
      bucket: self.bucket[self.currentBucket],
      key: self.key[self.currentKey],
      value: self.value[self.currentValue]
    });
  }
  return results;
};
/**
 * gets the next set of data to read and performs the request on the client.
 * @return {undefined}
 */
Put.prototype._read = function() {
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
      self.client.put({
        key: current.key,
        bucket: current.bucket,
        vclock: self.options.vclock,
        w: self.options.w,
        dw: self.options.dw,
        return_body: self.options.vclock,
        pw: self.options.pw,
        if_not_modified: self.options.if_not_modified,
        if_none_match: self.options.if_none_match,
        return_head: self.options.return_head,
        timeout: self.options.timeout,
        asis: self.options.asis,
        sloppy_quorum: self.options.sloppy_quorum,
        n_val: self.options.n_val,
        type: self.options.type,
        content: {
          value: JSON.stringify(current.value),
          content_type: 'application/json',
          indexes: self.options.indexes
        }
      }).on('data', function(data) {
        results.push({
          bucket: current.bucket,
          key: data.key || current.key,
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

module.exports = function(options) {
  return new Put(options);
};
