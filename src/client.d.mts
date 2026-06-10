/**
 * Type declarations for the ESM entry point (client.mjs). The runtime
 * wrapper re-exports the CommonJS implementation; these declarations mirror
 * that so ESM TypeScript consumers resolve true ESM shapes instead of
 * CJS-interop ambiguity.
 */
import createClient from './client.js';

declare const Client: typeof createClient.Client;
type Client = InstanceType<typeof createClient.Client>;

export default createClient;
export { Client };
