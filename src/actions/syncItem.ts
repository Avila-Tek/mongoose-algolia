import type { TDoc, TRemoveItemOptions } from '../types';
import { removeItem } from './removeItem';
import utils from '../utils';

/**
 * Synchronizes a Mongoose document with an Algolia index.
 *
 * Depending on the document's state and filter conditions, this function:
 * - Removes the item from the Algolia index if it doesn't meet the filter criteria.
 * - Creates or updates the document in the Algolia index if it was newly added or modified.
 *
 * @template T
 * @param {TRemoveItemOptions<T>} options - The options for synchronizing the item.
 * @param {object} options.client - The Algolia search client.
 * @param {TDoc} options.doc - The Mongoose document to synchronize.
 * @param {string} options.indexName - The name of the Algolia index.
 * @param {object} options.options - Additional options for the operation.
 * @param {boolean} [options.options.debug] - Whether to enable debug logging.
 * @param {function} [options.options.filter] - A function to filter documents before synchronization.
 * @param {object} [options.options.populate] - Population options to include related data.
 * @returns {Promise<void | undefined>} Resolves when the synchronization completes or returns `undefined` if no action was needed.
 */
export async function syncItem<T = unknown>({
  client,
  doc,
  indexName,
  options,
}: TRemoveItemOptions<T>) {
  // If the document does not pass the filter, remove it from Algolia.
  if (options.filter && !options.filter(doc._doc)) {
    return removeItem({
      client,
      doc,
      indexName,
      options,
    });
  }

  // If the document was neither newly created nor modified, do nothing.
  if (!doc.algoliaWasNew && !doc.algoliaWasModified) {
    return undefined;
  }

  let populated: Omit<TDoc, never> | null = null;

  try {
    // Populate the document with related data if applicable.
    populated = await utils.applyPopulation(doc as any, options.populate);
  } catch (err) {
    utils.logger.Error('Error (at population)', err);
  }

  try {
    if (!populated) {
      throw new Error('Populated is null');
    }
    // Save the populated document to the Algolia index.
    const content = await client.saveObject({
      indexName,
      body: populated.getAlgoliaObject(),
    });

    // Log success if debug mode is enabled.
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
