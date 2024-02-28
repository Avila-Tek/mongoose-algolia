import { Model, Schema, Types, model } from 'mongoose';
import { algoliaIntegration } from '../../src';
import type { TStaticMethods } from '../../src/types';

interface ICharacter {
  name: {
    firstname: string;
    lastname: string;
  };
  properties: string[];
  shows: Types.ObjectId[];
  age: number;
  counter: number;
  parents: {
    mother: string;
    father: string;
  };
}

type CharacterModel = Model<ICharacter> & TStaticMethods;

const characterSchema = new Schema<ICharacter, CharacterModel, TStaticMethods>(
  {
    name: {
      firstname: String,
      lastname: String,
    },
    properties: [String],
    shows: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Show',
      },
    ],
    age: {
      type: Number,
    },
    counter: {
      type: Number,
      default: 1,
    },
    parents: {
      mother: {
        type: String,
      },
      father: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

characterSchema.plugin(algoliaIntegration<ICharacter>, {
  appId: process.env.ALGOLIA_APP_ID!,
  apiKey: process.env.ALGOLIA_API_KEY!,
  indexName: 'characters',
  populate: {
    path: 'shows',
    select: 'name genre -_id',
  },
  defaults: {
    age: -1,
    properties: 'notset',
    parents: {
      mother: 'notset',
    },
  },
  virtuals: {
    sentence(doc) {
      return `${doc.name.firstname} says hi!`;
    },
  },
  mappings: {
    name(value) {
      return `${value.firstname} ${value.lastname}`;
    },
  },
  debug: true,
});

export const Character = model<ICharacter, CharacterModel>(
  'Character',
  characterSchema
);

Character.setAlgoliaSettings({
  searchableAttributes: ['name', 'properties', 'shows', 'age'],
});
