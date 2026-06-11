# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
(0.x minor versions may contain breaking changes).

## [Unreleased]

### Added
- GitHub Pages site at <https://defstream.github.io/rihawk/> (Tailwind CSS,
  served from `docs/`; rebuild styles with `make docs`).
- Stylistic type-checked linting (`tseslint.configs.stylisticTypeChecked`).
- OpenSSF Scorecard workflow publishing supply-chain posture results.
- Opt-in pre-commit hook running lint + typecheck (`make hooks`).

### Changed
- Dev toolchain upgraded to ESLint 10, TypeScript 6, and `@types/node` 25;
  the CI lint job builds first so type-aware rules resolve the package's
  own declarations.

### Fixed
- A counter legitimately at 0 emitted `value: undefined` from `putCrdt`
  streams due to `||`-chaining; now uses nullish coalescing.
- `concurrent: 0` no longer ends streams prematurely; the effective
  minimum is 1.
- Declaration emit failed under TypeScript 6 (TS4094): client methods now
  declare named stream return types instead of leaving the compiler to
  synthesize anonymous class types with private fields.

## [0.3.0] - 2026-06-10

### Added
- TypeScript: the source is now TypeScript, compiled to `dist/` with
  generated type declarations shipped to consumers.
- ESM support: `import rihawk, { Client } from 'rihawk'` via an exports map
  and a thin `.mjs` wrapper over the CommonJS build.
- Stream tuning: every client method accepts a trailing `streamOptions`
  argument — `concurrent` (parallel requests per batch), `highWaterMark`,
  and `signal` (an `AbortSignal` that destroys the stream).
- Read-ahead: the next batch is prefetched while the consumer drains,
  overlapping round-trip latency with processing.
- Request errors carry their failing coordinate (`error.bucket`,
  `error.key`, ...).
- `put` honors `options.content_type`, storing the raw value instead of
  JSON when set.
- ESLint (typescript-eslint, type-aware), `npm run typecheck`, and
  `npm run test:coverage`.
- CI hardening: SHA-pinned actions, least-privilege permissions,
  lint/typecheck/audit/coverage jobs, Dependabot, CodeQL, and a
  best-effort integration job against a real Riak service container.
- Packaging validation (`npm run check:package`, publint + attw) in CI.
- Release workflow publishing with npm provenance on `v*` tags; SECURITY.md.
- Benchmark harness (`make bench`) sweeping concurrency levels against a
  live Riak node.

### Fixed
- ESM TypeScript consumers resolved CJS-flavored type declarations
  ("masquerading as CJS"); the `import` condition now serves dedicated
  `.d.mts` declarations.

### Changed
- `destroy()` now drops buffered records and stops issuing requests.
- Deep imports move from `rihawk/lib/streams/*` to `rihawk/streams/*`.

## [0.2.0] - 2026-06-10

### Changed
- **Backend migrated from `riakpbc` to `no-riak`** — riakpbc was
  unmaintained since 2014 with unfixable vulnerable dependencies; no-riak
  audits clean and supports TLS authentication. The public API is
  unchanged.
- Vector clocks are returned as base64 strings; with `autoJSON` (default
  on) stored JSON is parsed automatically on reads.
- Constructor options are now no-riak's (`connectionString`, `pool`,
  `retries`, `auth`, `tls`, ...).
- `getIndex` records include a `continuation` field for paging.

### Added
- `client.end()` closes the connection pool.
- `client.client` exposes the underlying no-riak client.
- Makefile with dev tasks and a live-Riak `verify` round-trip.

## [0.1.0] - 2026-06-10

### Changed
- Modernized for Node.js >= 22 (was >= 0.10.32): ES2022 classes, a shared
  `RiakStream` base class, native promises instead of `neo-async`, and
  `node:test` with a mocked client instead of mocha/chai against a live
  server.
- Removed `doxx` (vulnerable, abandoned) and its generated HTML docs;
  removed 16 empty stream placeholder files.

### Fixed
- Required-option validation never ran (argument arity mismatch).
- `put` never reset its value cursor, reading `undefined` past the first key.
- Failed requests stalled the stream; errors are now re-emitted and the
  stream continues.
- Buffered records were discarded when `concurrent > 1`.
- `return_body: false` (and similar flags) were silently ignored due to
  `|| true` defaults.

## [0.0.11] and earlier

Initial development against Node 0.10 and `riakpbc` (2014–2015).

[0.3.0]: https://github.com/defstream/rihawk/releases/tag/v0.3.0
[0.2.0]: https://github.com/defstream/rihawk/releases/tag/v0.2.0
[0.1.0]: https://github.com/defstream/rihawk/releases/tag/v0.1.0
