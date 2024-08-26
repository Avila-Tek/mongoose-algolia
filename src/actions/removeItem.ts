import type { TRemoveItemOptions } from '../types';
import utils from '../utils';

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
