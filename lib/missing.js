module.exports = {
  options: function(method, options, keys, stream) {
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!options || !options[key]) {
        setImmediate(errorAndEndStream(stream, false, new Error('#' + method + ': options.' + key + ' was not provided.')));
        return true;
      }
    }
    return false;
  }
};
