'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { Readable } = require('node:stream');

const createClient = require('../lib/client');
const { Client } = createClient;
const { mockClient, collect } = require('./helpers');

/** Builds a Client whose underlying no-riak client is replaced with a mock. */
function stubbedClient(respond) {
  const client = createClient({});
  client.client = mockClient(respond);
  return client;
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
});
