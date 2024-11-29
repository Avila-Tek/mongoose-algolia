import type { Document, IfAny, Model, Require_id, Schema } from 'mongoose';
import type {
  TIndexConfig,
  TMongooseAlgoliaOptions,
  TStaticMethods,
} from './types';
import type { Algoliasearch } from 'algoliasearch';
import clc from 'cli-color';

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
  if (typeof options.chunkSize === 'number' && options.chunkSize > 500) {
    throw new TypeError(
      `Chunk size cannot >= 500 actual(${options.chunkSize})`
    );
  }
  const chunkSize = options?.chunkSize ?? 100;
  const totalObjects = await this.countDocuments();
  const pages = Math.ceil(totalObjects / chunkSize);
  let page = 1;

  while (page <= pages) {
    let docs: any[] = [];
    const indicesMap: Record<
      string,
      {
        index: TIndexConfig;
        docs: any[];
      }
    > = {};
    console.log(`CHUNCK ${page}/${pages} ...`);
    try {
      let query = null;
      if (options.populate) {
        query = this.find(
          {},
          {},
          {
            skip: (page - 1) * chunkSize,
            limit: page * chunkSize,
          }
        ).populate(options.populate as any);
      } else {
        query = this.find(
          {},
          {},
          {
            skip: (page - 1) * chunkSize,
            limit: page * chunkSize,
          }
        );
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
      for (const index of options.indexes) {
        const indexName = index.indexName;
        if (indicesMap[indexName]) {
          indicesMap[indexName].docs.push(doc);
        } else {
          indicesMap[indexName] = {
            index,
            docs: [doc],
          };
        }
      }
    }

    // Clear the indexes
    try {
      for (const currentIndexName of Object.keys(indicesMap)) {
        if (page === 1) {
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
    // Set settings
    try {
      for (const [indexName, indexData] of Object.entries(indicesMap)) {
        await client.setSettings({
          indexName: indexData.index.indexName,
          indexSettings: indexData.index.indexSettings,
          forwardToReplicas: indexData.index.forwardToReplicas,
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
        let objects = indicesMap[currentIndexName].docs;

        if (typeof options.filter !== 'undefined' && options.filter !== null) {
          objects = objects.filter((obj) => {
            if (options.filter) {
              return options.filter(obj._doc);
            }
            return true;
          });
        }

        objects = await Promise.all(
          objects.map((obj) => obj.getAlgoliaObject())
        );
        await client.saveObjects({
          indexName: currentIndexName,
          objects: objects,
        });
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
    page += 1;
  }
}
