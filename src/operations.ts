import type { Algoliasearch } from 'algoliasearch';
import { Query, Model, Schema } from 'mongoose';
import type {
  TActionFunctionType,
  TMongooseAlgoliaOptions,
  TStaticMethods,
} from './types';
import { removeItem } from './actions/removeItem';
import { syncItem } from './actions/syncItem';
import utils from './utils';

export function operations<T, TModel = Model<T, any, TStaticMethods, any>>(
  schema: Schema<T, TModel>,
  options: TMongooseAlgoliaOptions<Schema<T>>,
  client: Algoliasearch
) {
  schema.pre('save', function (next) {
    let isModified = false;

    const relevantKeys = utils.getRelevantKeys(this.toJSON(), options.selector);
    if (relevantKeys !== null && Array.isArray(relevantKeys)) {
      relevantKeys.forEach((key) => {
        if (this.isModified(key)) {
          isModified = true;
        }
      });
    } else if (this.isModified()) {
      isModified = true;
    }

    (this as any).algoliaWasNew = this.isNew;
    (this as any).algoliaWasModified = isModified;
    next();
  });

  schema.post('findOneAndUpdate', async function () {
    const query = this.getQuery();
    const doc = await this.findOne(query).clone().exec();
    if ('active' in doc && doc.active === false) {
      await runActionOnIndices(doc, removeItem);
      return;
    }
    await runActionOnIndices(doc, syncItem);
  });

  schema.post('save', async function () {
    await runActionOnIndices(this, syncItem);
  });

  schema.pre('findOneAndDelete', async function () {
    const query = this.getQuery();
    const doc = await this.findOne(query).clone().exec();
    await runActionOnIndices(doc, removeItem);
  });

  schema.post('deleteOne', async function () {
    await runActionOnIndices(this, removeItem);
  });

  async function runActionOnIndices(doc: any, action: TActionFunctionType) {
    const indexName = await utils.getIndexName(doc as any, options.indexName);
    // This is a workaroung for the deleteOne query
    // the idea si to preserve the _id before the delete query is executed
    if (doc instanceof Query) {
      doc = {
        _id: doc.getFilter()._id,
      };
    }
    action({
      client,
      doc,
      indexName,
      options,
    });
  }

  schema.methods.syncToAlgolia = async function () {
    this.algoliaWasModified = true;
    this.algoliaWasNew = false;
    await runActionOnIndices(this, syncItem);
  };

  schema.methods.removeFromAlgolia = async function () {
    await runActionOnIndices(this, removeItem);
  };

  schema.methods.getAlgoliaObject = function () {
    return this.toObject({
      versionKey: false,
      virtuals: true,
      transform: (doc: any, ret: any) => {
        if (doc.constructor.modelName !== (this.constructor as any).modelName) {
          return ret;
        }

        ret = utils.applyVirtuals(ret, options.virtuals);
        ret = utils.applyMappings(ret, options.mappings);
        ret = utils.applyDefaults(ret, options.defaults);
        ret = utils.applySelector(ret, options.selector);

        ret.objectID = doc._id;
        delete ret._id;

        return ret;
      },
    });
  };
}
