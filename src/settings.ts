import type { IndexSettings, SearchClient } from 'algoliasearch';
import type { Document, IfAny, Model, Require_id, Schema } from 'mongoose';
import type { TMongooseAlgoliaOptions, TStaticMethods } from './types';
import clc from 'cli-color';
import utils from './utils';

export async function syncSettings<T = any>(
  this: Model<
    T,
    any,
    TStaticMethods,
    any,
    IfAny<T, any, Document<unknown, any, T> & Omit<Require_id<T>, never>>,
    any
  >,
  settings: IndexSettings,
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
      await client.setSettings({
        indexName,
        indexSettings: settings,
      });
      if (options.debug) {
        console.log(
          clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
          clc.cyanBright('@avila-tek/mongoose-algolia'),
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
      clc.cyanBright('@avila-tek/mongoose-algolia'),
      ' -> ',
      clc.red.bold('Error'),
      ' -> ',
      err
    );
  }
}
