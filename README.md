# Rihawk

[![CI](https://github.com/defstream/rihawk/actions/workflows/ci.yml/badge.svg)](https://github.com/defstream/rihawk/actions/workflows/ci.yml)

A streaming Riak client with advanced features, built on
[no-riak](https://github.com/oleksiyk/no-riak). Written in TypeScript —
type declarations ship with the package.

Every client method accepts single values **or arrays** for its bucket/key style
parameters and returns an object-mode readable stream that emits one record per
response across the full combination of inputs — so fetching six keys from two
buckets is one call and one stream. While you process records, the next batch
is already being fetched.

## Requirements

- Node.js >= 22
- A reachable [Riak](https://riak.com/) node (protocol buffers port, default `8087`)

## Installation

```sh
npm install rihawk
```

## Usage

```javascript
// CommonJS
const rihawk = require('rihawk');

// ESM / TypeScript
import rihawk, { Client } from 'rihawk';

const client = rihawk({
  connectionString: '127.0.0.1:8087',
  connectionTimeout: 3000,
  pool: { min: 3, max: 12 },
  retries: 3,
  autoJSON: true
});
```

The factory works with or without `new`, and the `Client` class is also
exported.

All streams emit:

- `data` — one record per response
- `error` — a failed request; the error carries its coordinate
  (`error.bucket`, `error.key`, ...) and the stream **continues** with the
  remaining requests
- `end` — every requested combination has been processed

With the default `autoJSON: true`, stored JSON values are parsed automatically
on reads. Vector clocks are returned as base64 strings.

### Stream tuning

Every method takes an optional trailing `streamOptions` argument:

```javascript
const controller = new AbortController();

client.get('nfl_team', manyKeys, { r: 2 }, {
  concurrent: 8,            // requests issued in parallel per batch (default 1)
  highWaterMark: 32,        // records buffered before backpressure (default 16)
  signal: controller.signal // aborting destroys the stream
});
```

## API

### `rihawk(options)`

Returns a new `Client`.

- **options** — [no-riak client options](https://github.com/oleksiyk/no-riak#connection-pooling-and-load-balancing):
  `connectionString` (`'host:port:weight,host:port,...'`), `pool`, `retries`,
  `connectionTimeout`, `autoJSON`, `auth`, `tls`, ...

### `client.get(bucket, key, [options], [streamOptions])`

Returns values for every bucket/key combination.

- **bucket** — a string, or an array of strings, naming the bucket(s) to query.
- **key** — a string, or an array of strings, naming the key(s) to fetch.
- **options** — Riak request options (`r`, `pr`, `notfound_ok`, `timeout`, `type`, ...).

Emits `{ bucket, key, vclock, content }`. Keys that are not found are skipped.

```javascript
client.get('nfl_team', ['CHI', 'MIA', 'SD'])
  .on('data', (data) => console.log('#DATA', data))
  .on('error', (error) => console.error('#ERROR', error.bucket, error.key, error))
  .on('end', () => console.log('#END'));
```

### `client.put(bucket, key, value, [options], [streamOptions])`

Stores values for every bucket/key/value combination. Values are stored as
JSON unless `options.content_type` is set, in which case they are stored as
given.

- **value** — any JSON-serializable value, or an array of them.
- **options** — Riak request options (`w`, `dw`, `vclock`, `indexes`,
  `content_type`, `return_body` — defaults to `true` — ...).

Emits `{ bucket, key, vclock, content }`.

```javascript
client.put('nfl_team', 'CHI', { name: 'Chicago Bears' })
  .on('data', (data) => console.log('#DATA', data))
  .on('end', () => console.log('#END'));

// Store raw (non-JSON) content:
client.put('pages', 'home', '<h1>hi</h1>', { content_type: 'text/html' });
```

### `client.getIndex(bucket, index, value, [options], [streamOptions])`

Returns keys matching a secondary index for every bucket/index/value combination.

- **index** — a string, or an array of strings, naming the index(es) (for example `team_bin`).
- **value** — a string, or an array of strings, the index must match exactly.
- **options** — Riak request options (`max_results`, `continuation`, `timeout`, `type`, ...).

Emits `{ bucket, index, value, keys, continuation }`. When `max_results` is
set, pass the emitted `continuation` back via `options.continuation` to page
through the rest.

### `client.putCrdt(bucket, key, op, [options], [streamOptions])`

Applies CRDT operation(s) for every bucket/key/op combination.

- **op** — a [Riak data type operation](https://docs.riak.com/riak/kv/latest/developing/data-types/index.html)
  (`counter_op`, `set_op`, `map_op`), or an array of them.
- **options** — Riak request options; `type` names the bucket type (defaults to `'default'`).

Emits `{ bucket, key, context, counter_value, set_value, map_value, value }`.

### `client.getCrdt(bucket, key, [options], [streamOptions])`

Returns CRDT(s) for every bucket/key combination.
Emits `{ bucket, key, context, type, value }`.

### `client.updateCounter(bucket, key, value, [options], [streamOptions])`

Convenience wrapper around `putCrdt` that increments (or, with a negative
`value`, decrements) the counter(s) at every bucket/key combination.

```javascript
client.updateCounter('nfl_teams_count', 'alls', 1, { type: 'counter' })
  .on('data', (data) => console.log('#COUNT', data.value))
  .on('end', () => console.log('#END'));
```

### `client.getCounter(bucket, key, [options], [streamOptions])`

Alias of `client.getCrdt`.

### `client.end()`

Closes the underlying connection pool. Returns a promise.

### `client.client`

The underlying [no-riak](https://github.com/oleksiyk/no-riak) client, for
operations rihawk does not wrap (`del`, `listKeys`, `mapReduce`, search,
bucket administration, and the `Riak.CRDT.*` wrappers).

### Stream factories

Every stream factory under `client.streams` (`Get`, `Put`, `GetCrdt`,
`PutCrdt`, `GetIndex`) can also be used directly — or imported from
`rihawk/streams/*` — and accepts:

- **client** — a no-riak client instance (required).
- **options** — per-request Riak options.
- **concurrent**, **highWaterMark**, **signal** — stream tuning, as above.

```javascript
import Get from 'rihawk/streams/get';

const stream = Get({
  client: client.client,
  bucket: 'nfl_team',
  key: ['CHI', 'MIA', 'SD'],
  concurrent: 3
});
```

## Development

The source is TypeScript (`src/`), compiled to `dist/`. The test suite uses
the built-in [`node:test`](https://nodejs.org/api/test.html) runner with a
mocked no-riak client — no Riak server required — and runs against the
compiled output, importing the package by name to exercise the real exports.

```sh
npm test               # build + run tests (or: make test)
npm run test:coverage  # with a coverage report
npm run lint           # ESLint (type-aware)
npm run typecheck      # tsc --noEmit over src and test
npm run check:package  # validate exports map and shipped types (publint + attw)
npm run build          # compile src/ to dist/
```

Common tasks are also available through `make` (run `make` to list them),
including a live round-trip check and a throughput benchmark against a
local Riak node:

```sh
make riak-up    # start Riak KV in Docker
make verify     # put/get round-trip against 127.0.0.1:8087
make bench      # records/sec sweep across concurrency levels
make riak-down  # tear it down
```

Releases are published from CI with npm provenance when a `v*` tag is
pushed. Security reports: see [SECURITY.md](SECURITY.md).

See [CHANGELOG.md](CHANGELOG.md) for release history.

## License

[MIT](LICENSE)
