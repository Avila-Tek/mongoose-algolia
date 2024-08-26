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

function promisify<T>(value: T): Promise<T> {
  return value instanceof Promise ? value : Promise.resolve(value);
}

function getIndexName(doc: TDoc, indexName: TIndexName) {
  return promisify(typeof indexName !== 'string' ? indexName(doc) : indexName);
}

function applyPopulation(doc: TDoc, populate?: TPopulate) {
  if (!populate) {
    return doc;
  }
  return doc.populate(populate);
}

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

function setObjectPathValue(source: TDoc, path: string, value: any) {
  const parts = path.split('.');
  const len = parts.length;
  let target = source;

  for (let i = 0, part; i < len; i += 1) {
    part = parts[i];
    target =
      typeof target[part] === 'undefined' ? (target[part] = {}) : target[part];
  }
  target[parts[len - 1]] = value;
  return target;
}

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

function deleteObjectPathValue(source: TDoc, path: string) {
  const parts = path.split('.');
  const len = parts.length;
  let target = source;

  for (let i = 0, part; i < len; i += 1) {
    part = parts[i];
    target =
      typeof target[part] === 'undefined' ? (target[part] = {}) : target[part];
  }
  delete target[parts[len - 1]];
  return target;
}

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

const logger = {
  Error(action: string, err: any) {
    return console.error(
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

const utils = {
  getIndexName,
  applySelector,
  applyPopulation,
  applyDefaults,
  applyMappings,
  applyVirtuals,
  getRelevantKeys,
  logger,
};

export default utils;
