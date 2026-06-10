import { RiakStream, type RiakStreamOptions } from './base';
import type { Coordinate } from '../types';

/**
 * Streams secondary-index matches from one or more Riak buckets for one or
 * more index/value pairs.
 */
class GetIndex extends RiakStream {
  static override dimensions = ['bucket', 'index', 'value'] as const;

  override request({ bucket, index, value }: Coordinate): Promise<unknown> {
    const options = this.options;
    return this.client.index({
      bucket,
      index,
      key: value,
      qtype: 0,
      return_terms: options.return_terms ?? true,
      max_results: options.max_results,
      continuation: options.continuation,
      timeout: options.timeout,
      type: options.type,
      term_regex: options.term_regex,
      pagination_sort: options.pagination_sort
    });
  }

  override transform({ bucket, index, value }: Coordinate, data: unknown): Coordinate {
    const response = data as Record<string, unknown>;
    return {
      bucket,
      index,
      value,
      keys: response.results,
      continuation: response.continuation
    };
  }
}

interface GetIndexFactory {
  (options: Partial<RiakStreamOptions>): GetIndex;
  GetIndex: typeof GetIndex;
}

/** Creates a GetIndex stream. */
const factory = ((options: Partial<RiakStreamOptions>) => new GetIndex(options)) as GetIndexFactory;
factory.GetIndex = GetIndex;

export = factory;
