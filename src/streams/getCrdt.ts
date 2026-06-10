import { RiakStream, type RiakStreamOptions } from './base';
import type { Coordinate } from '../types';

/**
 * Streams CRDTs from one or more Riak buckets for one or more keys.
 */
class GetCrdt extends RiakStream {
  static override dimensions = ['bucket', 'key'] as const;

  override request({ bucket, key }: Coordinate): Promise<unknown> {
    const options = this.options;
    return this.client.dtFetch({
      bucket,
      key,
      r: options.r,
      pr: options.pr,
      basic_quorum: options.basic_quorum,
      notfound_ok: options.notfound_ok,
      timeout: options.timeout,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type ?? 'default',
      include_context: options.include_context
    });
  }

  override transform({ bucket, key }: Coordinate, data: unknown): Coordinate {
    const response = data as Record<string, unknown>;
    return {
      bucket,
      key,
      context: response.context,
      type: response.type,
      value: response.value
    };
  }
}

interface GetCrdtFactory {
  (options: Partial<RiakStreamOptions>): GetCrdt;
  GetCrdt: typeof GetCrdt;
}

/** Creates a GetCrdt stream. */
const factory = ((options: Partial<RiakStreamOptions>) => new GetCrdt(options)) as GetCrdtFactory;
factory.GetCrdt = GetCrdt;

export = factory;
