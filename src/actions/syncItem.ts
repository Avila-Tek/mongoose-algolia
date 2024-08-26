import type { TDoc, TRemoveItemOptions } from '../types';
import { removeItem } from './removeItem';
import utils from '../utils';

export async function syncItem<T = unknown>({
  client,
  doc,
  indexName,
  options,
}: TRemoveItemOptions<T>) {
  if (options.filter && !options.filter(doc._doc)) {
    return removeItem({
      client,
      doc,
      indexName,
      options,
    });
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
    const content = await client.saveObject({
      indexName,
      body: populated.getAlgoliaObject(),
    });
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
