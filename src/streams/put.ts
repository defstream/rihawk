import { RiakStream, type RiakStreamOptions } from './base';
import type { Coordinate } from '../types';

/**
 * Streams values into one or more Riak buckets for one or more keys.
 * Values are serialized as JSON unless `options.content_type` is set, in
 * which case the value is stored as given.
 */
class Put extends RiakStream {
  static override dimensions = ['bucket', 'key', 'value'] as const;

  override request({ bucket, key, value }: Coordinate): Promise<unknown> {
    const options = this.options;
    return this.client.put({
      bucket,
      key,
      return_body: options.return_body ?? true,
      vclock: options.vclock,
      w: options.w,
      dw: options.dw,
      pw: options.pw,
      if_not_modified: options.if_not_modified,
      if_none_match: options.if_none_match,
      return_head: options.return_head,
      timeout: options.timeout,
      asis: options.asis,
      sloppy_quorum: options.sloppy_quorum,
      n_val: options.n_val,
      type: options.type,
      content: {
        value: options.content_type ? value : JSON.stringify(value),
        content_type: options.content_type || 'application/json',
        indexes: options.indexes
      }
    });
  }

  override transform({ bucket, key }: Coordinate, data: unknown): Coordinate {
    const response = data as Record<string, unknown>;
    return {
      bucket,
      key: response.key || key,
      vclock: response.vclock,
      content: response.content
    };
  }
}

type PutFactory = {
  (options: Partial<RiakStreamOptions>): Put;
  Put: typeof Put;
};

/** Creates a Put stream. */
const factory = ((options: Partial<RiakStreamOptions>) => new Put(options)) as PutFactory;
factory.Put = Put;

export = factory;
