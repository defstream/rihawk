/**
 * Live round-trip check against a real Riak node: put a JSON value, read it
 * back, compare. Retries until the node accepts connections (Riak takes
 * 30-60s to boot), so it works unchanged against a fresh Docker container
 * or a CI service container.
 *
 * Counters/CRDTs are deliberately not exercised: they require a bucket type
 * created via riak-admin, which a stock container does not have.
 *
 * Environment:
 *   RIAK_HOST          host:port, default 127.0.0.1:8087
 *   VERIFY_TIMEOUT_MS  total retry budget, default 120000
 */
import rihawk from 'rihawk';

const host = process.env.RIAK_HOST || '127.0.0.1:8087';
const client = rihawk({ connectionString: host, connectionTimeout: 2000 });

function collect(stream) {
  return new Promise((resolve, reject) => {
    const data = [];
    stream
      .on('data', (record) => data.push(record))
      .on('error', reject)
      .on('end', () => resolve(data));
  });
}

async function roundTrip() {
  const value = { ok: true, at: Date.now() };

  const put = await collect(client.put('rihawk_verify', 'k1', value));
  console.log('put:', put[0]?.bucket, put[0]?.key);

  const got = await collect(client.get('rihawk_verify', 'k1'));
  if (got.length !== 1) {
    throw new Error(`expected 1 record, got ${got.length}`);
  }
  const stored = got[0].content[0].value;
  if (JSON.stringify(stored) !== JSON.stringify(value)) {
    throw new Error(`value mismatch: ${JSON.stringify(stored)}`);
  }
  console.log('get:', JSON.stringify(stored));
}

const deadline = Date.now() + (Number(process.env.VERIFY_TIMEOUT_MS) || 120000);
for (;;) {
  try {
    await roundTrip();
    console.log('verify: OK');
    break;
  } catch (error) {
    if (Date.now() > deadline) {
      console.error('verify: FAILED —', error.message);
      process.exitCode = 1;
      break;
    }
    console.log(`riak not ready (${error.message}), retrying in 3s...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

await client.end();
process.exit(process.exitCode ?? 0);
