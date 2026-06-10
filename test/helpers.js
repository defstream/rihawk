'use strict';

const { Readable } = require('node:stream');

/**
 * Builds a fake riakpbc client. Every method records its calls and returns a
 * readable stream of whatever `respond(method, request)` returns. Returning
 * an Error instance makes the response stream emit it as an 'error' event.
 * @param  {Function} [respond] maps (method, request) to an array of
 *                              responses, an Error, or undefined for an
 *                              empty (not-found) response.
 * @return {Object} the fake client with a `calls` array attached.
 */
function mockClient(respond = () => []) {
  const calls = [];
  const handler = (method) => (request) => {
    calls.push({ method, request });
    const responses = respond(method, request);
    if (responses instanceof Error) {
      return new Readable({
        objectMode: true,
        read() {
          this.destroy(responses);
        }
      });
    }
    return Readable.from(responses ?? [], { objectMode: true });
  };
  return {
    calls,
    get: handler('get'),
    put: handler('put'),
    getCrdt: handler('getCrdt'),
    putCrdt: handler('putCrdt'),
    getIndex: handler('getIndex')
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
