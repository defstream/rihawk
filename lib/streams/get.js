'use strict';

var util = require('util');
var Readable = require('stream').Readable;

util.inherits(Get, Readable);

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
    value: options.bucket
  });

  Object.defineProperty(this, 'key', {
    enumerable: true,
    writable: true,
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
  this.blue = true;

}

Get.prototype._read = function() {
  var self = this;
  var key = self.key.shift();

  if (key) {
    self.client.get({
      bucket: self.bucket,
      key: key,
      return_terms: self.options.return_terms || true,
      stream: true
    }).on('data', function(data) {
      self.push({
        bucket: self.bucket,
        key: key,
        content: data.content,
        vclock: data.vclock
      });
    }).on('error', errorAndEndStream(self, self.endOnError)).on('end', function() {
      if (!self.key || !self.key.length) {
        self.push(null);
      }
    });
  }
};

function errorAndEndStream(stream, endOnError, error) {
  return function(err) {
    stream.emit('error', err || error);
    if (endOnError) {
      stream.push(null);
    }
  };
}


module.exports = function(options) {
  return new Get(options);
}



