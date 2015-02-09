_CURRENTLY IN PROGRESS_
# Rihawk 0.0.1
A streaming riakpbc wrapper with advanced features. 

#API

### `new Rihawk(options)`
  Returns a new instance of the Rihawk client.

  **parameters:**
  - **options**: [riakpbc options](https://github.com/nlf/riakpbc/blob/master/lib/options.js)

  **returns**: a new instance of the Rihawk client.

  **example**:
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
  **parameters:** 
  - **bucket**: The bucket to query
  - **key**: The key to return a value for
  - **options**: The riak pbc request options

  **returns**: a readable stream emitting data events for each found value.

  **example**:
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
