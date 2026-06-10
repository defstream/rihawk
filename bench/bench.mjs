/**
 * Throughput benchmark against a live Riak node. Seeds N keys, then sweeps
 * `concurrent` levels over full-keyspace reads, reporting records/sec — so
 * claims about read-ahead and batching are measured, not asserted.
 *
 * Usage:
 *   make riak-up && make bench
 *
 * Environment:
 *   RIAK_HOST   host:port, default 127.0.0.1:8087
 *   BENCH_KEYS  keys to seed and read, default 500
 *   BENCH_RUNS  timed runs per concurrency level, default 3 (best reported)
 */
import rihawk from 'rihawk';

const host = process.env.RIAK_HOST || '127.0.0.1:8087';
const keyCount = Number(process.env.BENCH_KEYS) || 500;
const runs = Number(process.env.BENCH_RUNS) || 3;
const levels = [1, 4, 16];
const bucket = 'rihawk_bench';

const client = rihawk({
  connectionString: host,
  pool: { min: Math.max(...levels) }
});

const keys = Array.from({ length: keyCount }, (_, i) => `k${i}`);

function drain(stream) {
  return new Promise((resolve, reject) => {
    let records = 0;
    stream
      .on('data', () => records++)
      .on('error', reject)
      .on('end', () => resolve(records));
  });
}

console.log(`seeding ${keyCount} keys into '${bucket}' on ${host}...`);
await drain(
  client.put(bucket, keys, { padding: 'x'.repeat(256) }, { return_body: false }, { concurrent: 16 })
);

console.log(`\nreading ${keyCount} keys, best of ${runs} runs per level:\n`);
console.log('concurrent | records/sec | elapsed');
console.log('-----------|-------------|--------');

for (const concurrent of levels) {
  let best = Infinity;
  let records = 0;
  for (let run = 0; run < runs; run++) {
    const started = process.hrtime.bigint();
    records = await drain(client.get(bucket, keys, {}, { concurrent }));
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    best = Math.min(best, elapsedMs);
  }
  const rate = Math.round((records / best) * 1000);
  console.log(
    `${String(concurrent).padStart(10)} | ${String(rate).padStart(11)} | ${best.toFixed(0)}ms`
  );
}

await client.end();
