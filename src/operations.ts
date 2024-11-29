import { Algoliasearch } from 'algoliasearch';
import {
  TActionFunctionType,
  TMongooseAlgoliaOptions,
  TMongooseSchema,
} from './types';
import { Query, Schema } from 'mongoose';
import utils from './utils';
import { syncItem } from './actions/syncItem';
import { removeItem } from './actions/removeItem';

/**
 * Enhances a Mongoose schema with Algolia synchronization capabilities.
 *
 * This function integrates lifecycle hooks (`save`, `findOneAndUpdate`, `findOneAndDelete`, etc.)
 * to automatically sync documents with an Algolia index, supporting create, update, and delete operations.
 *
 * @template T
 * @param {T} schema - The Mongoose schema to enhance.
 * @param {TMongooseAlgoliaOptions<Schema<T>>} options - The configuration options for Algolia synchronization.
 * @param {Algoliasearch} client - The Algolia client instance for index operations.
 */
export function operations<T extends TMongooseSchema>(
  schema: T,
  options: TMongooseAlgoliaOptions<Schema<T>>,
  client: Algoliasearch
) {
  /**
   * Executes a specified action on all configured Algolia indices.
   *
   * @param {any} doc - The document or query to act upon.
   * @param {TActionFunctionType} action - The action function (e.g., sync or remove).
   */
  async function runActionOnIndices(doc: any, action: TActionFunctionType) {
    for (const index of options.indexes) {
      const indexName = index.indexName;
      // Workaround to preserve `_id` before a delete query is executed.
      if (doc instanceof Query) {
        doc = {
          _id: doc.getFilter()._id,
        };
      }
      await utils.promisify(
        action({
          client,
          doc,
          indexName,
          options,
        })
      );
    }
  }

  /**
   * Pre-save hook to track whether a document is new or modified for synchronization purposes.
   */
  schema.pre('save', async function (next) {
    let isModified = false;

    const relevantKeys = utils.getRelevantKeys(
      this.toJSON() as any,
      options.selector
    );
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

  /**
   * Post-update hook to sync the updated document to Algolia.
   */
  schema.post('findOneAndUpdate', async function () {
    const query = this.getQuery();
    const doc = await this.findOne(query).clone().exec();
    if ('active' in doc && doc.active === false) {
      if (options?.runOn?.isActiveFalse) {
        await runActionOnIndices(doc, removeItem);
      }
      return;
    }
    await runActionOnIndices(doc, syncItem);
  });

  /**
   * Post-save hook to sync the saved document to Algolia.
   */
  schema.post('save', async function () {
    await runActionOnIndices(this, syncItem);
  });

  /**
   * Pre-delete hook to remove the document from Algolia before deletion.
   */
  schema.pre('findOneAndDelete', async function () {
    const query = this.getQuery();
    const doc = await this.findOne(query).clone().exec();
    await runActionOnIndices(doc, removeItem);
  });

  /**
   * Post-delete hook to remove the document from Algolia after deletion.
   */
  schema.post('deleteOne', async function () {
    await runActionOnIndices(this, removeItem);
  });

  /**
   * Synchronizes the document to Algolia manually.
   *
   * @returns {Promise<void>} Resolves when synchronization is complete.
   */
  schema.methods.syncToAlgolia = async function () {
    this.algoliaWasModified = true;
    this.algoliaWasNew = false;
    await runActionOnIndices(this, syncItem);
  };

  /**
   * Removes the document from Algolia manually.
   *
   * @returns {Promise<void>} Resolves when the removal is complete.
   */
  schema.methods.removeFromAlgolia = async function () {
    await runActionOnIndices(this, removeItem);
  };

  /**
   * Prepares the document for Algolia indexing by applying transformations.
   *
   * @returns {object} The transformed document ready for indexing in Algolia.
   */
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
