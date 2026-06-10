import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Readable } from 'node:stream';

import createClient from 'rihawk';

import { mockClient, collect, type MockClient, type Responder } from './helpers';

const { Client } = createClient;

/** Builds a Client whose underlying no-riak client is replaced with a mock. */
function stubbedClient(respond?: Responder) {
  const client = createClient({});
  client.client = mockClient(respond);
  return client as InstanceType<typeof Client> & { client: MockClient };
}

describe('Client', () => {
  it('is constructable with and without new', () => {
    assert.ok(createClient({}) instanceof Client);
    assert.ok(new createClient({}) instanceof Client);
    assert.ok(new Client({}) instanceof Client);
  });

  it('aliases getCounter to getCrdt', () => {
    assert.equal(Client.prototype.getCounter, Client.prototype.getCrdt);
  });

  it('exposes the stream factories', () => {
    assert.deepEqual(
      Object.keys(Client.prototype.streams).sort(),
      ['Get', 'GetCrdt', 'GetIndex', 'Put', 'PutCrdt']
    );
    for (const [name, factory] of Object.entries(Client.prototype.streams)) {
      assert.equal(typeof factory, 'function');
      assert.equal(
        typeof (factory as unknown as Record<string, unknown>)[name],
        'function',
        `${name} class export`
      );
    }
  });

  it('get(bucket, key) streams values from the underlying client', async () => {
    const client = stubbedClient(() => ({ vclock: 'v', content: [{ value: '{}' }] }));

    const stream = client.get('nfl_team', 'MIA');
    assert.ok(stream instanceof Readable);

    const { data, errors } = await collect(stream);
    assert.equal(errors.length, 0);
    assert.equal(data.length, 1);
    assert.equal(data[0].bucket, 'nfl_team');
    assert.equal(data[0].key, 'MIA');
  });

  it('get([bucket], [key]) walks every combination', async () => {
    const client = stubbedClient(() => ({ vclock: 'v', content: [] }));

    const { data } = await collect(
      client.get(['nfl_team', 'mlb_team'], ['CHI', 'MIA'])
    );

    assert.deepEqual(
      data.map(({ bucket, key }) => bucket + ':' + key),
      ['nfl_team:CHI', 'nfl_team:MIA', 'mlb_team:CHI', 'mlb_team:MIA']
    );
  });

  it('put(bucket, key, value) writes JSON through the underlying client', async () => {
    const client = stubbedClient(() => ({ vclock: 'v', content: [] }));

    const { data, errors } = await collect(
      client.put('test_data', 'A', { name: 'Albert Einstein' })
    );

    assert.equal(errors.length, 0);
    assert.equal(data.length, 1);
    assert.equal(
      client.client.calls[0].request.content.value,
      JSON.stringify({ name: 'Albert Einstein' })
    );
  });

  it('getIndex(bucket, index, [value]) queries each value', async () => {
    const client = stubbedClient(() => ({ results: ['k'] }));

    const { data } = await collect(
      client.getIndex('nfl_team', 'team_bin', ['SD', 'MIA'])
    );

    assert.deepEqual(data.map(({ value }) => value), ['SD', 'MIA']);
  });

  it('putCrdt(bucket, [key], op) applies the op to each key', async () => {
    const client = stubbedClient(() => ({ counter_value: 1 }));

    const { data, errors } = await collect(
      client.putCrdt(
        'nfl_teams_count',
        ['alls', 'everyones'],
        { counter_op: { increment: 1 } },
        { type: 'counter' }
      )
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data.map(({ key }) => key), ['alls', 'everyones']);
  });

  it('updateCounter(bucket, key, value) builds the counter op', async () => {
    const client = stubbedClient(() => ({ counter_value: -1 }));

    const { data } = await collect(
      client.updateCounter('nfl_teams_count', 'alls', -1, { type: 'counter' })
    );

    assert.equal(data.length, 1);
    assert.deepEqual(
      client.client.calls[0].request.op,
      { counter_op: { increment: -1 } }
    );
  });

  it('getCounter(bucket, [key]) streams each counter', async () => {
    const client = stubbedClient(() => ({ type: 'counter', value: 7 }));

    const { data } = await collect(
      client.getCounter('nfl_teams_count', ['alls', 'everyones'], { type: 'counter' })
    );

    assert.deepEqual(data.map(({ value }) => value), [7, 7]);
  });

  it('passes streamOptions through to the stream', async () => {
    const client = stubbedClient(() => ({ vclock: 'v', content: [] }));

    const stream = client.get('b', ['1', '2', '3', '4'], {}, { concurrent: 2 });
    assert.equal(stream.concurrent, 2);

    const { data, errors } = await collect(stream);
    assert.equal(errors.length, 0);
    assert.equal(data.length, 4);
  });

  it('end() closes the underlying client', async () => {
    const client = stubbedClient();

    await client.end();

    assert.deepEqual(client.client.calls.map(({ method }) => method), ['end']);
  });
});
