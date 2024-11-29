import { ZodError } from 'zod';
import { Schema } from 'mongoose';
import { type TMongooseAlgoliaOptions, indexSchema } from './types';
import { algoliasearch } from 'algoliasearch';
import { operations } from './operations';
import { synchronize } from './syncronize';

export function algoliaIntegration<T extends Schema>(
  schema: T,
  opts: TMongooseAlgoliaOptions
) {
  const options: TMongooseAlgoliaOptions<Schema<T>> = {
    selector: null,
    defaults: null,
    mappings: null,
    virtuals: null,
    filter: null,
    populate: null,
    debug: false,
    chunkSize: 100,
    // Override default options with user supplied
    ...opts,
    runOn: {
      isActiveFalse: true,
      ...(opts?.runOn ?? {}),
    },
  };

  if (typeof options.indexes === 'undefined') {
    throw new TypeError(
      '[@avila-tek/mongoose-algolia]: The indexes opts is required'
    );
  }

  if (!Array.isArray(options.indexes)) {
    throw new TypeError(
      '[@avila-tek/mongoose-algolia]: The indexes should be an array'
    );
  }

  try {
    indexSchema.parse(options.indexes);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new TypeError(
        `[@avila-tek/mongoose-algolia]: ${JSON.stringify(err.errors)}`
      );
    }
  }

  if (!options.apiKey) {
    throw new TypeError(
      '[@avila-tek/mongoose-algolia]: The apiKey opts is required'
    );
  }

  if (!options.appId) {
    throw new TypeError(
      '[@avila-tek/mongoose-algolia]: The appId opts is required'
    );
  }

  const client = algoliasearch(options.appId, options.apiKey);

  operations<T>(schema, options, client);

  schema.statics.syncToAlgolia = async function () {
    const callable = synchronize.bind(this as any);
    return await callable(options, client);
  };
}
