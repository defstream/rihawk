/**
 * ESM entry point. Re-exports the CommonJS implementation so both
 * `import rihawk from 'rihawk'` and `import { Client } from 'rihawk'` work.
 */
import createClient from './client.js';

export default createClient;
export const Client = createClient.Client;
