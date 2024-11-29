import { type Algoliasearch, type SetSettingsProps } from 'algoliasearch';
import type {
  AnyObject,
  Document,
  PopulateOptions,
  ProjectionType,
  Schema,
} from 'mongoose';
import { z } from 'zod';

/**
 * Represents a Mongoose schema.
 * @typedef {Schema} TMongooseSchema
 */
export type TMongooseSchema = Schema;

/**
 * The name of an Algolia index or a function that generates it dynamically.
 * @typedef {string | ((args: any) => string)} TIndexName
 */
export type TIndexName = string | ((args: any) => string);

/**
 * Specifies fields to include or exclude when projecting a document.
 * @typedef {ProjectionType<T> | null | undefined} TSelector
 * @template T
 */
export type TSelector<T> = ProjectionType<T> | null | undefined;

/**
 * Default values for document fields.
 * @typedef {Record<string, any> | null | undefined} TDefault
 */
export type TDefault = Record<string, any> | null | undefined;

/**
 * Mapping functions to transform document fields.
 * @typedef {{ [key: string]: (doc: any) => any } | null | undefined} TMappings
 */
export type TMappings = { [key: string]: (doc: any) => any } | null | undefined;

/**
 * Virtual fields to add to documents.
 * @typedef {Record<string, (doc: any) => any> | null | undefined} TVirtuals
 */
export type TVirtuals = Record<string, (doc: any) => any> | null | undefined;

/**
 * Filter function to determine whether a document should be synchronized.
 * @typedef {((doc: any) => any) | null | undefined} TFilter
 */
export type TFilter = ((doc: any) => any) | null | undefined;

/**
 * Population options for including related data in documents.
 * @typedef {string | PopulateOptions | (PopulateOptions | string)[] | null | undefined} TPopulate
 */
export type TPopulate =
  | string
  | PopulateOptions
  | (PopulateOptions | string)[]
  | null
  | undefined;

/**
 * Configuration for an Algolia index.
 * @typedef {SetSettingsProps} TIndexConfig
 */
export type TIndexConfig = SetSettingsProps;

/**
 * Configuration options for integrating Mongoose with Algolia.
 * @typedef {object} TMongooseAlgoliaOptions
 * @template T
 * @property {string} appId - The Algolia application ID.
 * @property {string} apiKey - The Algolia API key.
 * @property {Array<TIndexConfig>} indexes - A list of index configurations.
 * @property {TSelector<T>} [selector] - Fields to include or exclude.
 * @property {TDefault} [defaults] - Default values for fields.
 * @property {TMappings} [mappings] - Field mapping transformations.
 * @property {TVirtuals} [virtuals] - Virtual fields to add.
 * @property {TFilter} [filter] - A filter function to determine sync eligibility.
 * @property {TPopulate} [populate] - Population options for related data.
 * @property {boolean} [debug=false] - Whether to enable debug mode.
 * @property {number} [chunkSize=100] - The number of documents to sync in a batch.
 * @property {object} [runOn] - Conditions for triggering synchronization.
 * @property {boolean} [runOn.isActiveFalse=true] - Whether to sync inactive documents.
 */
export type TMongooseAlgoliaOptions<T = TMongooseSchema> = {
  appId: string;
  apiKey: string;
  indexes: Array<TIndexConfig>;
  selector?: TSelector<T> | undefined | null;
  defaults?: TDefault | undefined | null;
  mappings?: TMappings | undefined | null;
  virtuals?: TVirtuals | undefined | null;
  filter?: TFilter | undefined | null;
  populate?: TPopulate | undefined | null;
  /** @default false */
  debug?: boolean | undefined;
  /** @default 100 */
  chunkSize?: number | undefined;
  runOn?: {
    /** @default true */
    isActiveFalse?: boolean;
  };
};

/**
 * Represents a Mongoose document with additional properties.
 * @typedef {Document<any> & Record<string, any>} TDoc
 */
export type TDoc = Document<any> & Record<string, any>;

/**
 * Represents static methods for synchronization.
 * @typedef {object} TStaticMethods
 * @property {() => Promise<void>} syncToAlgolia - Synchronizes the model to Algolia.
 */
export type TStaticMethods = {
  syncToAlgolia(): Promise<void>;
};

/**
 * Options for removing an item from an Algolia index.
 * @typedef {object} TRemoveItemOptions
 * @template T
 * @property {AnyObject} doc - The document to remove.
 * @property {Algoliasearch} client - The Algolia search client.
 * @property {string} indexName - The name of the Algolia index.
 * @property {TMongooseAlgoliaOptions<Schema<T>>} options - The configuration options.
 */
export type TRemoveItemOptions<T = unknown> = {
  doc: AnyObject;
  client: Algoliasearch;
  indexName: string;
  options: TMongooseAlgoliaOptions<Schema<T>>;
};

/**
 * A function type for performing an action on a document.
 * @typedef {(props: TRemoveItemOptions<T>) => Promise<void> | void} TActionFunctionType
 * @template T
 */
export type TActionFunctionType<T = unknown> = (
  props: TRemoveItemOptions<T>
) => Promise<void> | void;

/**
 * Schema for validating Algolia index configurations using Zod.
 * @typedef {z.ZodArray} indexSchema
 */
export const indexSchema = z.array(
  z.object({
    indexName: z.string().min(3),
    indexSettings: z.any().optional(),
    forwardToReplicas: z.boolean().optional().default(false),
  })
);
