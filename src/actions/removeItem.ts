import type { TRemoveItemOptions } from '../types';
import utils from '../utils';

/**
 * Removes an item from an Algolia index.
 *
 * @param {TRemoveItemOptions} options - The options for removing the item.
 * @param {object} options.client - The Algolia search client.
 * @param {object} options.doc - The Mongoose document to remove.
 * @param {string} options.indexName - The name of the Algolia index.
 * @param {object} options.options - Additional options for the operation.
 * @param {boolean} [options.options.debug] - Whether to enable debug logging.
 * @returns {Promise<void>} A promise that resolves when the item is successfully removed or logs an error if it fails.
 */
export async function removeItem({
  client,
  doc,
  indexName,
  options,
}: TRemoveItemOptions) {
  try {
    await client.deleteObject({
      indexName,
      objectID: doc._id.toString(),
    });
    if (options.debug) {
      utils.logger.Success('Deleted', doc._id);
    }
  } catch (err) {
    utils.logger.Error('Error', err);
  }
}
