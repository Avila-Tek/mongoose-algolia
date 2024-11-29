import clc from 'cli-color';
import deepKeys from 'deep-keys';
import type {
  TDefault,
  TDoc,
  TIndexName,
  TMappings,
  TPopulate,
  TSelector,
  TVirtuals,
} from './types';

/**
 * Wraps a value in a promise if it is not already a Promise.
 * @template T
 * @param {T} value - The value to wrap in a Promise.
 * @returns {Promise<T>} The resolved Promise.
 */
function promisify<T>(value: T): Promise<T> {
  return value instanceof Promise ? value : Promise.resolve(value);
}

/**
 * Resolves the index name for the document.
 * @param {TDoc} doc - The Mongoose document.
 * @param {TIndexName} indexName - The index name or a function returning it.
 * @returns {Promise<string>} The resolved index name.
 */
function getIndexName(doc: TDoc, indexName: TIndexName) {
  return promisify(typeof indexName !== 'string' ? indexName(doc) : indexName);
}

/**
 * Populates the Mongoose document if a population rule is provided.
 * @param {TDoc} doc - The Mongoose document.
 * @param {TPopulate} [populate] - The population rules.
 * @returns {TDoc} The populated document.
 */
function applyPopulation(doc: TDoc, populate?: TPopulate) {
  if (!populate) {
    return doc;
  }
  return doc.populate(populate);
}

/**
 * Applies mappings to the document fields using the specified mapping functions.
 * @param {TDoc} doc - The Mongoose document.
 * @param {TMappings} [mappings] - The mapping functions for each field.
 * @returns {TDoc} The transformed document.
 */
function applyMappings(doc: TDoc, mappings?: TMappings) {
  if (!mappings) {
    return doc;
  }
  Object.keys(mappings).forEach((key) => {
    // TODO: FIXME - Allow nested mappings
    if (typeof mappings[key] === 'function') {
      doc[key] = mappings[key](doc[key]);
    }
  });
  return doc;
}

/**
 * Adds virtual fields to the document.
 * @param {TDoc} doc - The Mongoose document.
 * @param {TVirtuals} virtuals - The virtual fields to add.
 * @returns {TDoc} The document with virtual fields.
 */
function applyVirtuals(doc: TDoc, virtuals: TVirtuals) {
  if (!virtuals) return doc;

  Object.keys(virtuals).forEach((key) => {
    if (key in doc) {
      console.error(
        clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
        clc.cyanBright('@avila-tek/mongoose-algolia'),
        ' -> ',
        clc.red.bold('Error (Virtuals)'),
        ` -> ${key} is already defined`
      );
    } else {
      doc[key] = virtuals[key](doc);
    }
  });

  return doc;
}

/**
 * Applies default values to the document fields.
 * @param {TDoc} doc - The Mongoose document.
 * @param {TDefault} [defaults] - The default values for fields.
 * @returns {TDoc} The document with defaults applied.
 */
function applyDefaults(doc: TDoc, defaults?: TDefault) {
  if (!defaults) return doc;

  (Object.keys(defaults) as any[]).forEach((key) => {
    // TODO: FIXME - Allow nested defaults
    if (key in doc) {
      doc[key] = defaults[key];
    }
  });

  return doc;
}

/**
 * Sets a nested value in an object using a dot-separated path.
 * @param {TDoc} source - The source object.
 * @param {string} path - The dot-separated path to set the value.
 * @param {*} value - The value to set.
 * @returns {TDoc} The updated source object.
 */
function setObjectPathValue(source: TDoc, path: string, value: any) {
  const parts = path.split('.');
  const len = parts.length;
  let target = source;

  for (let i = 0, part; i < len; i += 1) {
    part = parts[i];
    if (target[part] === 'undefined') {
      target[part] = {};
    }
    target = target[part];
  }
  target[parts[len - 1]] = value;
  return target;
}

/**
 * Retrieves a nested value from an object using a dot-separated path.
 * @param {TDoc} source - The source object.
 * @param {string} path - The dot-separated path to retrieve the value.
 * @returns {*} The retrieved value.
 */
function getObjectPathValue(source: TDoc, path: string) {
  const parts = path.split('.');
  const len = parts.length;
  let result = source;

  for (let i = 0; i < len; i += 1) {
    result =
      typeof result === 'object' && parts[i] in result
        ? result[parts[i]]
        : undefined;
  }

  return typeof result === 'object'
    ? result[parts[parts.length - 1]]
    : undefined;
}

/**
 * Deletes a nested value from an object using a dot-separated path.
 * @param {TDoc} source - The source object.
 * @param {string} path - The dot-separated path to delete the value.
 * @returns {TDoc} The updated source object.
 */
function deleteObjectPathValue(source: TDoc, path: string) {
  const parts = path.split('.');
  const len = parts.length;
  let target = source;

  for (let i = 0, part; i < len; i += 1) {
    part = parts[i];
    if (target[part] === 'undefined') {
      target[part] = {};
    }
    target = target[part];
  }
  delete target[parts[len - 1]];
  return target;
}

/**
 * Extracts `keep` and `remove` field lists from a selector object or string.
 * @template T
 * @param {TDoc} _doc - The Mongoose document.
 * @param {TSelector<T>} [selector] - The selector object or string.
 * @returns {{ keys: string[], remove: string[], keep: string[] }} The parsed selector fields.
 */
function getSelectors<T>(_doc: TDoc, selector?: TSelector<T>) {
  let keys: string[] = [];

  if (typeof selector === 'string') {
    keys = selector.split(' ');
  }

  if (
    selector &&
    selector instanceof Array === false &&
    typeof selector === 'object'
  ) {
    keys = Object.keys(selector).map((key) => {
      if ((selector as any)[key]) {
        return key;
      }

      return `-${key}`;
    });
  }

  const remove = keys
    .filter((key) => /^-{1}.+/.test(key))
    .map((key) => key.substring(1));
  const keep = keys.filter((key) => /^(?!-{1}).+/.test(key));
  return { keys, remove, keep };
}

/**
 * Filters document fields based on the selector.
 * @template T
 * @param {TDoc} doc - The Mongoose document.
 * @param {TSelector<T>} [selector] - The field selector.
 * @returns {TDoc} The filtered document.
 */
function applySelector<T>(doc: TDoc, selector?: TSelector<T>) {
  let _doc = doc;
  if (!selector) return _doc;

  const { keep, remove } = getSelectors(doc, selector);

  if (keep.length) {
    const modifiedDoc: any = {};

    keep.forEach((entry) => {
      if (entry.includes('.')) {
        setObjectPathValue(modifiedDoc, entry, getObjectPathValue(_doc, entry));
      } else {
        modifiedDoc[entry] = _doc[entry];
      }
    });

    _doc = modifiedDoc;
  } else if (remove.length) {
    remove.forEach((key) => deleteObjectPathValue(_doc, key));
  }
  return _doc;
}

/**
 * Logs an error message with a standardized format.
 * @param {string} action - The action being logged.
 * @param {*} err - The error details.
 */
const logger = {
  Error(action: string, err: any) {
    console.error(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('@avila-tek/mongoose-algolia'),
      ' -> ',
      clc.red.bold(action),
      ' -> ',
      err
    );
  },
  Success(action: string, id: any) {
    console.log(
      clc.blackBright(`[${new Date().toLocaleTimeString()}]`),
      clc.cyanBright('@avila-tek/mongoose-algolia'),
      ' -> ',
      clc.greenBright(action),
      ' -> ObjectId: ',
      id
    );
  },
};

/**
 * Retrieves keys relevant to indexing based on the provided selector.
 * Excludes default Mongoose fields like `_id` and `__v`.
 * @template T
 * @param {TDoc} doc - The Mongoose document.
 * @param {TSelector<T>} selector - The field selector.
 * @returns {string[] | null} The relevant keys for indexing, or `null` if no selector is provided.
 */
function getRelevantKeys<T>(doc: TDoc, selector: TSelector<T>) {
  if (!selector) return null;

  delete doc._id;
  delete doc.__v;

  const { remove, keep } = getSelectors(doc, selector);

  if (keep.length) {
    return keep;
  }

  if (remove.length) {
    const keys = deepKeys(doc);
    return keys.filter((key: any) => !remove.includes(key));
  }
  return null;
}

/**
 * Utility functions for Mongoose to Algolia synchronization.
 */
const utils = Object.freeze({
  getIndexName,
  applySelector,
  applyPopulation,
  applyDefaults,
  applyMappings,
  applyVirtuals,
  getRelevantKeys,
  promisify,
  logger,
});

export default utils;
