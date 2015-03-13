'use strict';

var util = require('util');
var async = require('neo-async');
var missing = require('../missing');
var Readable = require('stream').Readable;

util.inherits(GetIndex, Readable);

/**
 * Gets index values from a Riak bucket by the index name.
 * @class GetIndex
 * @param {Object} options The options for this getIndex request
 */
function GetIndex(options) {
    if (missing.options(options, ['client', 'bucket', 'index', 'value'], this))
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

    Object.defineProperty(this, 'index', {
      enumerable: true,
      value: [].concat(options.index)
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

    Object.defineProperty(this, 'max', {
      enumerable: true,
      value: options.max || 100
    });

    Object.defineProperty(this, 'currentBucket', {
      writable: true,
      value: 0
    });

    Object.defineProperty(this, 'currentIndex', {
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

    Object.defineProperty(this, 'buffer', {
      writable: true,
      value: []
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
GetIndex.prototype.next = function(limit) {
  var self = this;
  var results = [];
  for (var i = 0; i < (limit || self.concurrent || 1); i++) {
    if (++self.currentValue >= self.value.length) {
      if (++self.currentIndex >= self.index.length) {
        if (++self.currentBucket >= self.bucket.length) {
          return null;
        } else {
          self.currentIndex = 0;
          self.currentValue = 0;
        }
      } else {
        self.currentValue = 0;
      }
    }
    results.push({
      bucket: self.bucket[self.currentBucket],
      index: self.index[self.currentIndex],
      value: self.value[self.currentValue]
    });
  }
  return results;
};
/**
 * gets the next set of data to read and requests it from the client.
 * @return {undefined}
 */
GetIndex.prototype._read = function() {
  var self = this;
  if (self.paused) {
    return;
  }
  var results = [];
  var set = self.next(); // returns multiple
  if (!set && !self.buffer.length) {
    self.push(null);
    return;
  }
  if (self.buffer.length) {
    self.push(self.buffer.shift());
    return;
  }
  async.each(set, function(current, done) {
    if (current) {
      self.client.getIndex({
        bucket: current.bucket,
        index: current.index,
        key: current.value,
        qtype: 0,
        return_terms: self.options.return_terms || true,
        stream: self.options.stream || true,
        max_results: self.options.max_results,
        continuation: self.options.continuation,
        timeout: self.options.timeout,
        type: self.options.type,
        term_regex: self.options.term_regex,
        pagination_sort: self.options.pagination_sort
      }).on('data', function(data) {
        results.push({
          bucket: current.bucket,
          index: current.index,
          value: current.value,
          keys: data.keys
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
    } 
    if (!results.length) {
      self._read();
    } else {
      results.forEach(function(result) {
        self.buffer.push(result);
      });
      if (self.buffer.length) {
        self.push(self.buffer.shift());
      } else {
        self.push(null);
      }
    }
  });
};
/** exports the GetIndex stream **/
module.exports = function(options) {
  return new GetIndex(options);
};
