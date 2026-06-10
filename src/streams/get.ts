import { RiakStream, type RiakStreamOptions } from './base';
import type { Coordinate } from '../types';

/**
 * Streams values from one or more Riak buckets for one or more keys.
 */
class Get extends RiakStream {
  static override dimensions = ['bucket', 'key'] as const;

  override request({ bucket, key }: Coordinate): Promise<unknown> {
    const options = this.options;
    return this.client.get({
      bucket,
      key,
      r: options.r,
      pr: options.pr,
      basic_quorum: options.basic_quorum,
      notfound_ok: options.notfound_ok,
      if_modified: options.if_modified,
      head: options.head,
      deletedvclock: options.deletedvclock,
      timeout: options.timeout,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type
    });
  }

  override transform({ bucket, key }: Coordinate, data: unknown): Coordinate {
    const response = data as Record<string, unknown>;
    return {
      bucket,
      key,
      vclock: response.vclock,
      content: response.content
    };
  }
}

type GetFactory = {
  (options: Partial<RiakStreamOptions>): Get;
  Get: typeof Get;
};

/** Creates a Get stream. */
const factory = ((options: Partial<RiakStreamOptions>) => new Get(options)) as GetFactory;
factory.Get = Get;

export = factory;
