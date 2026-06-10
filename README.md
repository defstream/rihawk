# Rihawk

A streaming Riak client with advanced features, built on
[no-riak](https://github.com/oleksiyk/no-riak).

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
  connectionString: '127.0.0.1:8087',
  connectionTimeout: 3000,
  pool: { min: 3, max: 12 },
  retries: 3,
  autoJSON: true
});
```

The factory works with or without `new`, and the class is also exported:

```javascript
const { Client } = require('rihawk');
const client = new Client({ connectionString: '127.0.0.1:8087' });
```

All streams emit:

- `data` — one record per response
- `error` — a failed request; the stream **continues** with the remaining requests
- `end` — every requested combination has been processed

With the default `autoJSON: true`, stored JSON values are parsed automatically
on reads. Vector clocks are returned as base64 strings.

## API

### `rihawk(options)`

Returns a new `Client`.

- **options** — [no-riak client options](https://github.com/oleksiyk/no-riak#connection-pooling-and-load-balancing):
  `connectionString` (`'host:port:weight,host:port,...'`), `pool`, `retries`,
  `connectionTimeout`, `autoJSON`, `auth`, `tls`, ...

### `client.get(bucket, key, [options])`

Returns values for every bucket/key combination.

- **bucket** — a string, or an array of strings, naming the bucket(s) to query.
- **key** — a string, or an array of strings, naming the key(s) to fetch.
- **options** — Riak request options (`r`, `pr`, `notfound_ok`, `timeout`, `type`, ...).

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
- **options** — Riak request options (`w`, `dw`, `vclock`, `indexes`,
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
- **options** — Riak request options (`max_results`, `continuation`, `timeout`, `type`, ...).

Emits `{ bucket, index, value, keys, continuation }`. When `max_results` is
set, pass the emitted `continuation` back via `options.continuation` to page
through the rest.

```javascript
client.getIndex('nfl_team', 'division_bin', ['NFC-North', 'AFC-East'])
  .on('data', (data) => console.log('#DATA', data.keys))
  .on('end', () => console.log('#END'));
```

### `client.putCrdt(bucket, key, op, [options])`

Applies CRDT operation(s) for every bucket/key/op combination.

- **op** — a [Riak data type operation](https://docs.riak.com/riak/kv/latest/developing/data-types/index.html)
  (`counter_op`, `set_op`, `map_op`), or an array of them.
- **options** — Riak request options; `type` names the bucket type (defaults to `'default'`).

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

### `client.end()`

Closes the underlying connection pool. Returns a promise.

### `client.client`

The underlying [no-riak](https://github.com/oleksiyk/no-riak) client, for
operations rihawk does not wrap (`del`, `listKeys`, `mapReduce`, search,
bucket administration, and the `Riak.CRDT.*` wrappers).

### Stream options

Every stream factory under `client.streams` (`Get`, `Put`, `GetCrdt`,
`PutCrdt`, `GetIndex`) can also be used directly and accepts:

- **client** — a no-riak client instance (required).
- **concurrent** — how many requests to issue in parallel per read (default `1`).
- **options** — per-request Riak options.

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
runner with a mocked no-riak client — no Riak server required:

```sh
npm test        # or: make test
```

Common tasks are also available through `make` (run `make` to list them),
including a live round-trip check against a local Riak node:

```sh
make riak-up    # start Riak KV in Docker
make verify     # put/get round-trip against 127.0.0.1:8087
make riak-down  # tear it down
```

## License

[MIT](LICENSE)
