import algoliasearch from 'algoliasearch';
import type { Model, Schema } from 'mongoose';
import type { TMongooseAlgoliaOptions, TStaticMethods } from './types';
import { operations } from './operations';
import { TAlgoliaSettings, syncSettings } from './settings';
import { synchronize } from './syncronize';

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
    throw new TypeError('Mongoose-Algolia: The indexName opts is required');
  }

  if (!options.apiKey) {
    throw new TypeError('Mongoose-Algolia: The apiKey opts is required');
  }
  if (!options.appId) {
    throw new TypeError('Mongoose-Algolia: The appId opts is required');
  }

  const client = algoliasearch(options.appId, options.apiKey);

  operations<T>(schema, options, client);

  schema.statics.syncToAlgolia = async function () {
    const callable = await synchronize.bind(this as any);
    return callable(options, client);
  };

  schema.statics.setAlgoliaSettings = async function (
    settings: TAlgoliaSettings
  ) {
    if (!settings) {
      throw new Error('Mongoose-Algolia: You must provide settings');
    }
    const callable = await syncSettings.bind(this as any);
    return callable(settings, options, client);
  };
}
