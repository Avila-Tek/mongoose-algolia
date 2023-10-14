/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */
import clc from 'cli-color';
import type { SearchClient } from 'algoliasearch';
import type { Document, IfAny, Model, Require_id, Schema } from 'mongoose';
import type { Settings } from '@algolia/client-search';
import type { TMongooseAlgoliaOptions, TStaticMethods } from './types';
import utils from './utils';

export type TAlgoliaSettings = Settings;

export async function syncSettings<T = any>(
  this: Model<
    T,
    any,
    TStaticMethods,
    any,
    IfAny<T, any, Document<unknown, any, T> & Omit<Require_id<T>, never>>,
    any
  >,
  settings: TAlgoliaSettings,
  options: TMongooseAlgoliaOptions<Schema<T>>,
  client: SearchClient
) {
  try {
    const docs = await this.find().exec();
    const indices: string[] = [];

    // eslint-disable-next-line no-inner-declarations
    function addToIndex(entry: string) {
      if (!indices.includes(entry)) {
        indices.push(entry);
      }
    }

    for (const element of docs) {
      const index = await utils.getIndexName(element, options.indexName);
      addToIndex(index);
    }

    for (const indexName of indices) {
      const currentIndex = client.initIndex(indexName);
      await currentIndex.setSettings(settings);
      if (options.debug) {
        console.log(
          clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
          clc.cyanBright('Mongoose-Algolia'),
          ' -> ',
          clc.greenBright('Updated Settings'),
          ' -> ',
          indexName
        );
      }
    }
  } catch (err) {
    return console.error(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('Mongoose-Algolia'),
      ' -> ',
      clc.red.bold('Error'),
      ' -> ',
      err
    );
  }
}
