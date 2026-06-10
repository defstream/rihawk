import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Self-referencing import: resolves through the package.json exports map to
// the built dist/client.mjs wrapper, exercising the real consumer path.
import rihawk, { Client } from 'rihawk';

describe('ESM entry point', () => {
  it('exposes the factory as the default export', () => {
    assert.equal(typeof rihawk, 'function');
    assert.ok(rihawk({}) instanceof Client);
  });

  it('exposes Client as a named export', () => {
    assert.equal(Client, rihawk.Client);
    assert.ok(new Client({}) instanceof Client);
  });
});
