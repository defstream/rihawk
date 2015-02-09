module.exports = {
  options: function(method, options, keys, stream) {
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
};
