# Rihawk

A streaming [riakpbc](https://github.com/nlf/riakpbc) wrapper with advanced features.

Every client method accepts single values **or arrays** for its bucket/key style
parameters and returns an object-mode readable stream that emits one record per
response across the full combination of inputs — so fetching six keys from two
buckets is one call and one stream.

## Requirements

- Node.js >= 22
- A reachable [Riak](https://riak.com/) node (protocol buffers port, default `8087`)

## Installation

```sh
npm install rihawk
```

## Usage

```javascript
const rihawk = require('rihawk');

const client = rihawk({
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

The factory works with or without `new`, and the class is also exported:

```javascript
const { Client } = require('rihawk');
const client = new Client({ host: '127.0.0.1', port: 8087 });
```

All streams emit:

- `data` — one record per response
- `error` — a failed request; the stream **continues** with the remaining requests
- `end` — every requested combination has been processed

## API

### `rihawk(options)`

Returns a new `Client`.

- **options** — [riakpbc options](https://github.com/nlf/riakpbc/blob/master/lib/options.js)

### `client.get(bucket, key, [options])`

Returns values for every bucket/key combination.

- **bucket** — a string, or an array of strings, naming the bucket(s) to query.
- **key** — a string, or an array of strings, naming the key(s) to fetch.
- **options** — riakpbc request options (`r`, `pr`, `notfound_ok`, `timeout`, `type`, ...).

Emits `{ bucket, key, vclock, content }`. Keys that are not found are skipped.

```javascript
client.get('nfl_team', ['CHI', 'MIA', 'SD'])
  .on('data', (data) => console.log('#DATA', data))
  .on('error', (error) => console.error('#ERROR', error))
  .on('end', () => console.log('#END'));
```

### `client.put(bucket, key, value, [options])`

Stores values as JSON for every bucket/key/value combination.

- **value** — any JSON-serializable value, or an array of them.
- **options** — riakpbc request options (`w`, `dw`, `vclock`, `indexes`,
  `return_body` — defaults to `true` — ...).

Emits `{ bucket, key, vclock, content }`.

```javascript
client.put('nfl_team', 'CHI', { name: 'Chicago Bears' })
  .on('data', (data) => console.log('#DATA', data))
  .on('end', () => console.log('#END'));
```

### `client.getIndex(bucket, index, value, [options])`

Returns keys matching a secondary index for every bucket/index/value combination.

- **index** — a string, or an array of strings, naming the index(es) (for example `team_bin`).
- **value** — a string, or an array of strings, the index must match exactly.

Emits `{ bucket, index, value, keys }`.

```javascript
client.getIndex('nfl_team', 'division_bin', ['NFC-North', 'AFC-East'])
  .on('data', (data) => console.log('#DATA', data.keys))
  .on('end', () => console.log('#END'));
```

### `client.putCrdt(bucket, key, op, [options])`

Applies CRDT operation(s) for every bucket/key/op combination.

- **op** — a [Riak data type operation](https://docs.riak.com/riak/kv/latest/developing/data-types/index.html),
  or an array of them.
- **options** — riakpbc request options; `type` names the bucket type (defaults to `'default'`).

Emits `{ bucket, key, context, counter_value, set_value, map_value, value }`.

### `client.getCrdt(bucket, key, [options])`

Returns CRDT(s) for every bucket/key combination.
Emits `{ bucket, key, context, type, value }`.

### `client.updateCounter(bucket, key, value, [options])`

Convenience wrapper around `putCrdt` that increments (or, with a negative
`value`, decrements) the counter(s) at every bucket/key combination.

```javascript
client.updateCounter('nfl_teams_count', 'alls', 1, { type: 'counter' })
  .on('data', (data) => console.log('#COUNT', data.value))
  .on('end', () => console.log('#END'));
```

### `client.getCounter(bucket, key, [options])`

Alias of `client.getCrdt`.

### Stream options

Every stream factory under `client.streams` (`Get`, `Put`, `GetCrdt`,
`PutCrdt`, `GetIndex`) can also be used directly and accepts:

- **client** — a riakpbc client instance (required).
- **concurrent** — how many requests to issue in parallel per read (default `1`).
- **options** — per-request riakpbc options.

```javascript
const get = client.streams.Get({
  client: client.client,
  bucket: 'nfl_team',
  key: ['CHI', 'MIA', 'SD'],
  concurrent: 3
});
```

## Testing

The test suite uses the built-in [`node:test`](https://nodejs.org/api/test.html)
runner with a mocked riakpbc client — no Riak server required:

```sh
npm test
```

## License

[MIT](LICENSE)
