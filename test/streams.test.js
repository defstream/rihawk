'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const Get = require('../lib/streams/get');
const Put = require('../lib/streams/put');
const GetCrdt = require('../lib/streams/getCrdt');
const PutCrdt = require('../lib/streams/putCrdt');
const GetIndex = require('../lib/streams/getIndex');
const { mockClient, collect } = require('./helpers');

describe('Get', () => {
  it('emits one record per key', async () => {
    const client = mockClient((method, request) => [
      { vclock: 'v-' + request.key, content: [{ value: request.key }] }
    ]);

    const { data, errors } = await collect(
      Get({ client, bucket: 'nfl_team', key: ['SD', 'MIA', 'CHI'] })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(
      data.map(({ bucket, key, vclock }) => ({ bucket, key, vclock })),
      [
        { bucket: 'nfl_team', key: 'SD', vclock: 'v-SD' },
        { bucket: 'nfl_team', key: 'MIA', vclock: 'v-MIA' },
        { bucket: 'nfl_team', key: 'CHI', vclock: 'v-CHI' }
      ]
    );
  });

  it('walks every bucket and key combination, keys fastest', async () => {
    const client = mockClient(() => [{ vclock: 'v', content: [] }]);

    const { data } = await collect(
      Get({ client, bucket: ['a', 'b'], key: ['x', 'y'] })
    );

    assert.deepEqual(
      data.map(({ bucket, key }) => bucket + ':' + key),
      ['a:x', 'a:y', 'b:x', 'b:y']
    );
  });

  it('passes request options through to the client', async () => {
    const client = mockClient(() => []);

    await collect(
      Get({
        client,
        bucket: 'b',
        key: 'k',
        options: { r: 2, notfound_ok: false, timeout: 500, type: 'fruits' }
      })
    );

    assert.equal(client.calls.length, 1);
    const { method, request } = client.calls[0];
    assert.equal(method, 'get');
    assert.equal(request.bucket, 'b');
    assert.equal(request.key, 'k');
    assert.equal(request.r, 2);
    assert.equal(request.notfound_ok, false);
    assert.equal(request.timeout, 500);
    assert.equal(request.type, 'fruits');
  });

  it('skips not-found keys and still ends cleanly', async () => {
    const client = mockClient((method, request) =>
      request.key === 'missing' ? [] : [{ vclock: 'v', content: [] }]
    );

    const { data, errors } = await collect(
      Get({ client, bucket: 'b', key: ['one', 'missing', 'two'] })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data.map(({ key }) => key), ['one', 'two']);
  });

  it('re-emits client errors without ending the stream', async () => {
    const client = mockClient((method, request) =>
      request.key === 'bad' ? new Error('boom') : [{ vclock: 'v', content: [] }]
    );

    const { data, errors } = await collect(
      Get({ client, bucket: 'b', key: ['one', 'bad', 'two'] })
    );

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'boom');
    assert.deepEqual(data.map(({ key }) => key), ['one', 'two']);
  });

  it('emits an error when a required option is missing', async () => {
    const { data, errors } = await collect(Get({ client: mockClient(), bucket: 'b' }));

    assert.equal(data.length, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /options\.key was not provided/);
  });

  it('does not lose records when fetching concurrently', async () => {
    const client = mockClient((method, request) => [
      { vclock: 'v-' + request.key, content: [] }
    ]);

    const { data } = await collect(
      Get({ client, bucket: 'b', key: ['1', '2', '3', '4', '5'], concurrent: 3 })
    );

    assert.deepEqual(data.map(({ key }) => key).sort(), ['1', '2', '3', '4', '5']);
  });
});

describe('Put', () => {
  it('stores values as JSON and emits the response', async () => {
    const client = mockClient(() => [{ vclock: 'v', content: [] }]);

    const { data, errors } = await collect(
      Put({ client, bucket: 'b', key: 'k', value: { name: 'Albert Einstein' } })
    );

    assert.equal(errors.length, 0);
    assert.equal(data.length, 1);
    assert.deepEqual(data[0], { bucket: 'b', key: 'k', vclock: 'v', content: [] });

    const { request } = client.calls[0];
    assert.equal(request.content.value, JSON.stringify({ name: 'Albert Einstein' }));
    assert.equal(request.content.content_type, 'application/json');
  });

  it('requests the body back by default but honors return_body: false', async () => {
    const client = mockClient(() => [{}]);

    await collect(Put({ client, bucket: 'b', key: 'k', value: 1 }));
    await collect(Put({ client, bucket: 'b', key: 'k', value: 1, options: { return_body: false } }));

    assert.equal(client.calls[0].request.return_body, true);
    assert.equal(client.calls[1].request.return_body, false);
  });

  it('walks every bucket, key, and value combination', async () => {
    const client = mockClient(() => [{}]);

    const { data } = await collect(
      Put({ client, bucket: 'b', key: ['k1', 'k2'], value: ['v1', 'v2'] })
    );

    assert.equal(data.length, 4);
    assert.deepEqual(
      client.calls.map(({ request }) => request.key + '=' + request.content.value),
      ['k1="v1"', 'k1="v2"', 'k2="v1"', 'k2="v2"']
    );
  });
});

describe('GetCrdt', () => {
  it('emits context, type, and value per key', async () => {
    const client = mockClient(() => [{ context: 'ctx', type: 'counter', value: 41 }]);

    const { data, errors } = await collect(
      GetCrdt({ client, bucket: 'counts', key: 'alls', options: { type: 'counter' } })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data, [
      { bucket: 'counts', key: 'alls', context: 'ctx', type: 'counter', value: 41 }
    ]);
    assert.equal(client.calls[0].method, 'getCrdt');
    assert.equal(client.calls[0].request.type, 'counter');
  });
});

describe('PutCrdt', () => {
  it('applies an op and emits the CRDT result', async () => {
    const client = mockClient(() => [{ context: 'ctx', counter_value: 42 }]);

    const { data, errors } = await collect(
      PutCrdt({
        client,
        bucket: 'counts',
        key: 'alls',
        op: { counter_op: { increment: 1 } },
        options: { type: 'counter' }
      })
    );

    assert.equal(errors.length, 0);
    assert.equal(data.length, 1);
    assert.equal(data[0].counter_value, 42);
    assert.equal(data[0].value, 42);

    const { method, request } = client.calls[0];
    assert.equal(method, 'putCrdt');
    assert.deepEqual(request.op, { counter_op: { increment: 1 } });
    assert.equal(request.type, 'counter');
    assert.equal(request.return_body, true);
  });

  it('defaults the bucket type to "default"', async () => {
    const client = mockClient(() => [{}]);

    await collect(PutCrdt({ client, bucket: 'b', key: 'k', op: {} }));

    assert.equal(client.calls[0].request.type, 'default');
  });
});

describe('GetIndex', () => {
  it('queries the index and emits matching keys', async () => {
    const client = mockClient(() => [{ keys: ['A', 'B'] }]);

    const { data, errors } = await collect(
      GetIndex({ client, bucket: 'relationship', index: 'team_bin', value: 'CHI' })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data, [
      { bucket: 'relationship', index: 'team_bin', value: 'CHI', keys: ['A', 'B'] }
    ]);

    const { method, request } = client.calls[0];
    assert.equal(method, 'getIndex');
    assert.equal(request.index, 'team_bin');
    assert.equal(request.key, 'CHI');
    assert.equal(request.qtype, 0);
    assert.equal(request.return_terms, true);
    assert.equal(request.stream, true);
  });

  it('walks every bucket, index, and value combination', async () => {
    const client = mockClient(() => [{ keys: [] }]);

    const { data } = await collect(
      GetIndex({ client, bucket: 'b', index: ['i1', 'i2'], value: ['v1', 'v2'] })
    );

    assert.deepEqual(
      data.map(({ index, value }) => index + ':' + value),
      ['i1:v1', 'i1:v2', 'i2:v1', 'i2:v2']
    );
  });
});
