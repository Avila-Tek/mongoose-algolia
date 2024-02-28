/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
import type { AnyObject, Model, Schema } from 'mongoose';
import type { SearchClient, SearchIndex } from 'algoliasearch';
import type { TDoc, TMongooseAlgoliaOptions, TStaticMethods } from './types';
import utils from './utils';

export function operations<T, TModel = Model<T, any, TStaticMethods, any>>(
  schema: Schema<T, TModel>,
  options: TMongooseAlgoliaOptions<Schema<T>>,
  client: SearchClient
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

  async function runActionOnIndices(
    doc: AnyObject,
    action: (_doc: AnyObject, index: SearchIndex) => any
  ) {
    const indexName = await utils.getIndexName(doc as any, options.indexName);
    action(doc, client.initIndex(indexName));
  }

  async function removeItem(doc: AnyObject, index: SearchIndex) {
    try {
      await index.deleteObject(doc._id.toString());
      if (options.debug) {
        utils.logger.Success('Deleted', doc._id);
      }
    } catch (err) {
      utils.logger.Error('Error', err);
    }
  }

  async function syncItem(doc: AnyObject, index: SearchIndex) {
    if (options.filter && !options.filter(doc._doc)) {
      return removeItem(doc, index);
    }
    if (!doc.algoliaWasNew && !doc.algoliaWasModified) {
      return undefined;
    }
    let populated: Omit<TDoc, never> | null = null;
    try {
      populated = await utils.applyPopulation(doc as any, options.populate);
    } catch (err) {
      utils.logger.Error('Error (at population)', err);
    }
    try {
      if (!populated) {
        throw new Error('Populated is null');
      }
      const content = await index.saveObject(populated.getAlgoliaObject());
      if (options.debug) {
        utils.logger.Success(
          doc.algoliaWasNew ? 'Created' : 'Updated',
          content.objectID
        );
      }
    } catch (err) {
      utils.logger.Error('Error (at uploading)', err);
    }
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
