import type {
  PopulateOptions,
  ProjectionType,
  Schema,
  Document,
} from 'mongoose';

export type TIndexName = string | ((args: any) => string);

export type TSelector<T> = ProjectionType<T> | null | undefined;

export type TDefault = Record<string, any> | null | undefined;

export type TMappings = { [key: string]: (doc: any) => any } | null | undefined;

export type TVirtuals = Record<string, (doc: any) => any> | null | undefined;

export type TFilter = ((doc: any) => any) | null | undefined;

export type TPopulate =
  | string
  | PopulateOptions
  | (PopulateOptions | string)[]
  | null
  | undefined;

export type TMongooseAlgoliaOptions<T = Schema> = {
  indexName: TIndexName;
  appId: string;
  apiKey: string;
  selector?: TSelector<T>;
  defaults?: TDefault;
  mappings?: TMappings;
  virtuals?: TVirtuals;
  filter?: TFilter;
  populate?: TPopulate;
  debug?: boolean;
};

export type TDoc = Document<any> & Record<string, any>;

export type TStaticMethods = {
  syncToAlgolia(): void;
  setAlgoliaSettings(settings: any): void;
};
