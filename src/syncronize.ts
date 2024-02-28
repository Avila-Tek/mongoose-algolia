/* eslint-disable camelcase */
/* eslint-disable no-await-in-loop */
import clc from 'cli-color';
import type { Schema, Model, IfAny, Require_id, Document } from 'mongoose';
import type { SearchClient } from 'algoliasearch';
import type { TMongooseAlgoliaOptions, TStaticMethods } from './types';
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
  client: SearchClient
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
      clc.cyanBright('Mongoose-Algolia'),
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

  try {
    for (const currentIndexName of Object.keys(indicesMap)) {
      const currentIndex = client.initIndex(currentIndexName);
      if (await currentIndex.exists()) {
        await currentIndex.clearObjects();
        if (options.debug) {
          console.log(
            clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
            clc.cyanBright('Mongoose-Algolia'),
            ' -> ',
            clc.greenBright('Cleared Index'),
            ' -> ',
            currentIndexName
          );
        }
      } else if (options.debug) {
        console.log(
          clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
          clc.cyanBright('Mongoose-Algolia'),
          ' -> ',
          clc.redBright(`${currentIndexName} does not exist`),
          ' -> ',
          clc.greenBright('Cleared Index'),
          ' -> ',
          currentIndexName
        );
      }
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

        await currentIndex.saveObjects(chunk);
      }
      // await currentIndex.saveObjects(objects);
    }
  } catch (err) {
    console.error(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('Mongoose-Algolia'),
      ' -> ',
      clc.red.bold('Error'),
      ' -> ',
      err
    );
  }
}
