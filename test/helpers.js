'use strict';

/**
 * Builds a fake no-riak client. Every method records its calls and resolves
 * to whatever `respond(method, request)` returns. Returning an Error
 * instance makes the call reject with it; returning null/undefined emulates
 * a not-found response.
 * @param  {Function} [respond] maps (method, request) to a response object,
 *                              an Error, or null/undefined.
 * @return {Object} the fake client with a `calls` array attached.
 */
function mockClient(respond = () => null) {
  const calls = [];
  const handler = (method) => (request) => {
    calls.push({ method, request });
    const response = respond(method, request);
    if (response instanceof Error) {
      return Promise.reject(response);
    }
    return Promise.resolve(response);
  };
  return {
    calls,
    get: handler('get'),
    put: handler('put'),
    index: handler('index'),
    dtFetch: handler('dtFetch'),
    dtUpdate: handler('dtUpdate')
  };
}

/**
 * Consumes a stream, collecting 'data' and 'error' events until it ends or
 * closes.
 * @param  {Readable} stream
 * @return {Promise<{data: Object[], errors: Error[]}>}
 */
function collect(stream) {
  return new Promise((resolve) => {
    const data = [];
    const errors = [];
    stream
      .on('data', (record) => data.push(record))
      .on('error', (error) => errors.push(error))
      .on('end', () => resolve({ data, errors }))
      .on('close', () => resolve({ data, errors }));
  });
}

module.exports = { mockClient, collect };
