# Rihawk 0.0.1 - CURRENTLY IN PROGRESS
A streaming riakpbc wrapper with advanced features. 

#API

### `new Rihawk(options)`

Returns a new instance of the Rihawk client.

**Parameters:**
- **options**: [riakpbc Options](https://github.com/nlf/riakpbc/blob/master/lib/options.js)

**Response**: A new instance of the Rihawk client.

**Example**:
```javascript
var Rihawk = require('rihawk');

var client = new Rihawk({
  host: '127.0.0.1',
  port: 8087,
  connectTimeout: 1000,
  idleTimeout: 30000,
  maxLifetime: 500000,
  minConnections: 3,
  maxConnections: 12,
  parseValues: true
});
```

### `client.get(bucket, key, options)`
**Parameters:** 
- **bucket**: The bucket to query
- **key**: The key to return a value for
- **options**: The riak pbc request options

**Response**: An instance of the Get response stream.

**Example**:
```javascript
var request = client.get('nfl_team', 'CHI')
  .on('data', function(data) {
    console.log('#DATA', data);
  })
  .on('error', function(error) {
    console.log('#ERROR', error);
  }).on('end', function() {
    console.log('#END');
  });
```
