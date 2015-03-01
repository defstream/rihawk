'use strict';

var util = require('util');
var async = require('neo-async');
var missing = require('../missing');
var Readable = require('stream').Readable;

util.inherits(PutCrdt, Readable);

function PutCrdt(options) {
    if (missing.options(options, ['client', 'bucket', 'key', 'op'], this))
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

    Object.defineProperty(this, 'op', {
      enumerable: true,
      value: [].concat(options.op)
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

    Object.defineProperty(this, 'currentOp', {
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
PutCrdt.prototype.next = function(limit) {
  var self = this;
  var results = [];
  for (var i = 0; i < (limit || self.concurrent || 1); i++) {
    if (++self.currentOp >= self.op.length) {
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
      op: self.op[self.currentOp]
    });
  }
  return results;
};
/**
 * gets the next set of data to read and performs the request on the client.
 * @return {undefined}
 */
PutCrdt.prototype._read = function() {
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
      self.client.putCrdt({
        key: current.key,
        bucket: current.bucket,
        op: current.op,
        context: self.options.context,
        include_context: self.options.include_context,
        return_body: self.options.return_body || true,
        w: self.options.w,
        dw: self.options.dw,
        pw: self.options.pw,
        timeout: self.options.timeout,
        sloppy_quorum: self.options.sloppy_quorum,
        n_val: self.options.n_val,
        type: self.options.type || 'default'
      }).on('data', function(data) {
        results.push({
          bucket: current.bucket,
          key: data.key || current.key,
          context: data.context,
          counter_value: data.counter_value,
          set_value: data.set_value,
          map_value: data.map_value,
          value: data.counter_value || data.map_value || data.set_value
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
  return new PutCrdt(options);
};
