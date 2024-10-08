import { algoliasearch, IndexSettings } from 'algoliasearch';
import type { Model, Schema } from 'mongoose';
import { operations } from './operations';
import { syncSettings } from './settings';
import { synchronize } from './syncronize';
import type { TMongooseAlgoliaOptions, TStaticMethods } from './types';

export function algoliaIntegration<T = any>(
  schema: Schema<T, Model<T, any, TStaticMethods, any>>,
  opts: TMongooseAlgoliaOptions<Schema<T>>
) {
  const options: TMongooseAlgoliaOptions<Schema<T>> = {
    selector: null,
    defaults: null,
    mappings: null,
    virtuals: null,
    filter: null,
    populate: null,
    debug: false,
    // Override default options with user supplied
    ...opts,
  };

  if (!options.indexName) {
    throw new TypeError(
      '[@avila-tek/mongoose-algolia]: The indexName opts is required'
    );
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

  schema.statics.setAlgoliaSettings = async function (settings: IndexSettings) {
    if (!settings) {
      throw new Error(
        '[@avila-tek/mongoose-algolia]: You must provide settings'
      );
    }
    const callable = syncSettings.bind(this as any);
    return await callable(settings, options, client);
  };
}
