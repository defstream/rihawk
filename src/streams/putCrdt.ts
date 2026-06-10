import { RiakStream, type RiakStreamOptions } from './base';
import type { Coordinate } from '../types';

/**
 * Streams CRDT operations into one or more Riak buckets for one or more keys.
 */
class PutCrdt extends RiakStream {
  static override dimensions = ['bucket', 'key', 'op'] as const;

  override request({ bucket, key, op }: Coordinate): Promise<unknown> {
    const options = this.options;
    return this.client.dtUpdate({
      bucket,
      key,
      op,
      context: options.context,
      include_context: options.include_context,
      return_body: options.return_body ?? true,
      w: options.w,
      dw: options.dw,
      pw: options.pw,
      timeout: options.timeout,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type || 'default'
    });
  }

  override transform({ bucket, key }: Coordinate, data: unknown): Coordinate {
    const response = data as Record<string, unknown>;
    return {
      bucket,
      key: response.key || key,
      context: response.context,
      counter_value: response.counter_value,
      set_value: response.set_value,
      map_value: response.map_value,
      value: response.counter_value || response.map_value || response.set_value
    };
  }
}

type PutCrdtFactory = {
  (options: Partial<RiakStreamOptions>): PutCrdt;
  PutCrdt: typeof PutCrdt;
};

/** Creates a PutCrdt stream. */
const factory = ((options: Partial<RiakStreamOptions>) => new PutCrdt(options)) as PutCrdtFactory;
factory.PutCrdt = PutCrdt;

export = factory;
