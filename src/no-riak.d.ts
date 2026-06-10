/**
 * Minimal ambient types for the (untyped) no-riak package. Only the surface
 * rihawk touches is declared; everything else stays unknown.
 */
declare module 'no-riak' {
  class Client {
    constructor(options?: Record<string, unknown>);
    get(params: Record<string, unknown>): Promise<unknown>;
    put(params: Record<string, unknown>): Promise<unknown>;
    index(params: Record<string, unknown>): Promise<unknown>;
    dtFetch(params: Record<string, unknown>): Promise<unknown>;
    dtUpdate(params: Record<string, unknown>): Promise<unknown>;
    end(): Promise<unknown>;
  }
  const CRDT: Record<string, unknown>;
  export { Client, CRDT };
}
