import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Get from 'rihawk/streams/get';
import Put from 'rihawk/streams/put';
import GetCrdt from 'rihawk/streams/getCrdt';
import PutCrdt from 'rihawk/streams/putCrdt';
import GetIndex from 'rihawk/streams/getIndex';

import { mockClient, collect } from './helpers';

describe('Get', () => {
  it('emits one record per key', async () => {
    const client = mockClient((method, request) => ({
      vclock: 'v-' + request.key,
      content: [{ value: request.key }]
    }));

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
    const client = mockClient(() => ({ vclock: 'v', content: [] }));

    const { data } = await collect(
      Get({ client, bucket: ['a', 'b'], key: ['x', 'y'] })
    );

    assert.deepEqual(
      data.map(({ bucket, key }) => bucket + ':' + key),
      ['a:x', 'a:y', 'b:x', 'b:y']
    );
  });

  it('passes request options through to the client', async () => {
    const client = mockClient(() => null);

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
      request.key === 'missing' ? null : { vclock: 'v', content: [] }
    );

    const { data, errors } = await collect(
      Get({ client, bucket: 'b', key: ['one', 'missing', 'two'] })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data.map(({ key }) => key), ['one', 'two']);
  });

  it('re-emits client errors without ending the stream', async () => {
    const client = mockClient((method, request) =>
      request.key === 'bad' ? new Error('boom') : { vclock: 'v', content: [] }
    );

    const { data, errors } = await collect(
      Get({ client, bucket: 'b', key: ['one', 'bad', 'two'] })
    );

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'boom');
    assert.deepEqual(data.map(({ key }) => key), ['one', 'two']);
  });

  it('assigns the failing coordinate onto re-emitted errors', async () => {
    const client = mockClient(() => new Error('boom'));

    const { errors } = await collect(Get({ client, bucket: 'teams', key: 'CHI' }));

    assert.equal(errors.length, 1);
    assert.equal(errors[0].bucket, 'teams');
    assert.equal(errors[0].key, 'CHI');
  });

  it('aborts via AbortSignal', async () => {
    const controller = new AbortController();
    const client = mockClient(() => ({ vclock: 'v', content: [] }));

    const stream = Get({ client, bucket: 'b', key: 'k', signal: controller.signal });
    controller.abort();

    const { errors } = await collect(stream);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].name, 'AbortError');
    assert.ok(stream.destroyed);
  });

  it('stops fetching once destroyed', async () => {
    const client = mockClient(() => ({ vclock: 'v', content: [] }));

    const stream = Get({ client, bucket: 'b', key: ['1', '2', '3', '4', '5'] });
    stream.once('data', () => stream.destroy());
    await collect(stream);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.ok(
      client.calls.length < 5,
      `expected fetching to stop early, saw ${client.calls.length} calls`
    );
  });

  it('prefetches the next batch while the consumer drains (highWaterMark)', async () => {
    const client = mockClient((method, request) => ({
      vclock: 'v-' + request.key,
      content: []
    }));

    const stream = Get({ client, bucket: 'b', key: ['1', '2', '3'], highWaterMark: 1 });
    await new Promise((resolve) => stream.once('readable', resolve));
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.ok(
      client.calls.length >= 2,
      `expected read-ahead to issue the next request, saw ${client.calls.length} calls`
    );

    const { data } = await collect(stream);
    assert.equal(client.calls.length, 3);
    assert.ok(data.length > 0);
  });

  it('emits an error when a required option is missing', async () => {
    const { data, errors } = await collect(Get({ client: mockClient(), bucket: 'b' }));

    assert.equal(data.length, 0);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /options\.key was not provided/);
  });

  it('does not lose records when fetching concurrently', async () => {
    const client = mockClient((method, request) => ({
      vclock: 'v-' + request.key,
      content: []
    }));

    const { data } = await collect(
      Get({ client, bucket: 'b', key: ['1', '2', '3', '4', '5'], concurrent: 3 })
    );

    assert.deepEqual(data.map(({ key }) => key).sort(), ['1', '2', '3', '4', '5']);
  });
});

describe('Put', () => {
  it('stores values as JSON and emits the response', async () => {
    const client = mockClient(() => ({ vclock: 'v', content: [] }));

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
    const client = mockClient(() => ({}));

    await collect(Put({ client, bucket: 'b', key: 'k', value: 1 }));
    await collect(Put({ client, bucket: 'b', key: 'k', value: 1, options: { return_body: false } }));

    assert.equal(client.calls[0].request.return_body, true);
    assert.equal(client.calls[1].request.return_body, false);
  });

  it('walks every bucket, key, and value combination', async () => {
    const client = mockClient(() => ({}));

    const { data } = await collect(
      Put({ client, bucket: 'b', key: ['k1', 'k2'], value: ['v1', 'v2'] })
    );

    assert.equal(data.length, 4);
    assert.deepEqual(
      client.calls.map(({ request }) => request.key + '=' + request.content.value),
      ['k1="v1"', 'k1="v2"', 'k2="v1"', 'k2="v2"']
    );
  });

  it('stores the raw value when content_type is set', async () => {
    const client = mockClient(() => ({}));

    await collect(
      Put({
        client,
        bucket: 'b',
        key: 'k',
        value: 'plain text',
        options: { content_type: 'text/plain' }
      })
    );

    assert.equal(client.calls[0].request.content.value, 'plain text');
    assert.equal(client.calls[0].request.content.content_type, 'text/plain');
  });
});

describe('GetCrdt', () => {
  it('emits context, type, and value per key', async () => {
    const client = mockClient(() => ({
      context: 'ctx',
      type: 'counter',
      value: { counter_value: 41 }
    }));

    const { data, errors } = await collect(
      GetCrdt({ client, bucket: 'counts', key: 'alls', options: { type: 'counter' } })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data, [
      { bucket: 'counts', key: 'alls', context: 'ctx', type: 'counter', value: { counter_value: 41 } }
    ]);
    assert.equal(client.calls[0].method, 'dtFetch');
    assert.equal(client.calls[0].request.type, 'counter');
  });

  it('defaults the bucket type to "default"', async () => {
    const client = mockClient(() => ({}));

    await collect(GetCrdt({ client, bucket: 'b', key: 'k' }));

    assert.equal(client.calls[0].request.type, 'default');
  });
});

describe('PutCrdt', () => {
  it('applies an op and emits the CRDT result', async () => {
    const client = mockClient(() => ({ context: 'ctx', counter_value: 42 }));

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
    assert.equal(method, 'dtUpdate');
    assert.deepEqual(request.op, { counter_op: { increment: 1 } });
    assert.equal(request.type, 'counter');
    assert.equal(request.return_body, true);
  });

  it('defaults the bucket type to "default"', async () => {
    const client = mockClient(() => ({}));

    await collect(PutCrdt({ client, bucket: 'b', key: 'k', op: {} }));

    assert.equal(client.calls[0].request.type, 'default');
  });
});

describe('GetIndex', () => {
  it('queries the index and emits matching keys', async () => {
    const client = mockClient(() => ({ results: ['A', 'B'], continuation: 'next' }));

    const { data, errors } = await collect(
      GetIndex({ client, bucket: 'relationship', index: 'team_bin', value: 'CHI' })
    );

    assert.equal(errors.length, 0);
    assert.deepEqual(data, [
      {
        bucket: 'relationship',
        index: 'team_bin',
        value: 'CHI',
        keys: ['A', 'B'],
        continuation: 'next'
      }
    ]);

    const { method, request } = client.calls[0];
    assert.equal(method, 'index');
    assert.equal(request.index, 'team_bin');
    assert.equal(request.key, 'CHI');
    assert.equal(request.qtype, 0);
    assert.equal(request.return_terms, true);
  });

  it('walks every bucket, index, and value combination', async () => {
    const client = mockClient(() => ({ results: [] }));

    const { data } = await collect(
      GetIndex({ client, bucket: 'b', index: ['i1', 'i2'], value: ['v1', 'v2'] })
    );

    assert.deepEqual(
      data.map(({ index, value }) => index + ':' + value),
      ['i1:v1', 'i1:v2', 'i2:v1', 'i2:v2']
    );
  });
});
