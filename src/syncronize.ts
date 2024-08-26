import type { Document, IfAny, Model, Require_id, Schema } from 'mongoose';
import type { TMongooseAlgoliaOptions, TStaticMethods } from './types';
import type { Algoliasearch } from 'algoliasearch';
import clc from 'cli-color';
import utils from './utils';

export async function synchronize<T = any>(
  this: Model<
    T,
    any,
    TStaticMethods,
    any,
    IfAny<T, any, Document<unknown, any, T> & Omit<Require_id<T>, never>>,
    any
  >,
  options: TMongooseAlgoliaOptions<Schema<T>>,
  client: Algoliasearch
) {
  let docs: any[] = [];
  const indicesMap: Record<string, any[]> = {};
  try {
    let query = null;
    if (options.populate) {
      query = this.find().populate(options.populate as any);
    } else {
      query = this.find();
    }
    docs = await query.exec();
  } catch (err) {
    console.error(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('@avila-tek/mongoose-algolia'),
      ' -> ',
      clc.red.bold('Error'),
      ' -> ',
      err
    );
  }

  for (const doc of docs) {
    const indexName = await utils.getIndexName(doc, options.indexName);
    if (indicesMap[indexName]) {
      indicesMap[indexName].push(doc);
    } else {
      indicesMap[indexName] = [doc];
    }
  }

  // Clear the indexes
  try {
    for (const currentIndexName of Object.keys(indicesMap)) {
      await client.clearObjects({ indexName: currentIndexName });
      if (options.debug) {
        console.log(
          clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
          clc.cyanBright('@avila-tek/mongoose-algolia'),
          ' -> ',
          clc.greenBright('Cleared Index'),
          ' -> ',
          currentIndexName
        );
      }
    }
  } catch (err) {
    console.error(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('@avila-tek/mongoose-algolia'),
      ' -> ',
      clc.red.bold('Error'),
      ' -> ',
      err
    );
  }

  // sync the indexes again

  try {
    for (const currentIndexName of Object.keys(indicesMap)) {
      let objects = indicesMap[currentIndexName];

      if (typeof options.filter !== 'undefined' && options.filter !== null) {
        objects = objects.filter((obj) => {
          if (options.filter) {
            return options.filter(obj._doc);
          }
          return true;
        });
      }

      objects = await Promise.all(objects.map((obj) => obj.getAlgoliaObject()));
      const chunkSize = options?.chunkSize ?? 100;
      const chunks = Math.ceil(objects.length / chunkSize);
      for (let i = 0; i < chunks; i += 1) {
        const chunk =
          i === chunkSize - 1
            ? objects.slice(i * chunkSize)
            : objects.slice(i * chunkSize, (i + 1) * chunkSize);

        await client.saveObjects({
          indexName: currentIndexName,
          objects: chunk,
        });
      }
    }
  } catch (err) {
    console.error(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('@avila-tek/mongoose-algolia'),
      ' -> ',
      clc.red.bold('Error'),
      ' -> ',
      err
    );
  }
}
