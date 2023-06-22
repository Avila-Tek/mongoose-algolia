# @avila-tek/mongoose-algolia

> ❗️ This lib is an updated fork of [crsten/mongoose-algolia](https://github.com/crsten/mongoose-algolia)

This is [Mongoose](http://mongoosejs.com/) plugin to automatically sync documents to [Algolia](https://www.algolia.com/)

- [@avila-tek/mongoose-algolia](#avila-tekmongoose-algolia)
  - [Installation](#installation)
    - [Usage](#usage)
  - [Options](#options)
    - [appId / apiKey](#appid--apikey)
    - [indexName](#indexname)
    - [selector](#selector)
    - [populate](#populate)
    - [defaults](#defaults)
    - [mappings](#mappings)
    - [virtuals](#virtuals)
    - [filter](#filter)
    - [debug](#debug)
  - [Methods](#methods)
    - [syncToAlgolia](#synctoalgolia)
    - [setAlgoliaSettings](#setalgoliasettings)
    - [doc.ayncToAlgolia](#docaynctoalgolia)
    - [doc.removeFromAlgolia](#docremovefromalgolia)
  - [License](#license)

## Installation

`npm install --save @avila-tek/mongoose-algolia`

### Usage

```ts
import { Model, Schema, Types, model } from 'mongoose';
import { algoliaIntegration } from '@avila-tek/mongoose-algolia';
import type { TStaticMethods } from '@avila-tek/mongoose-algolia';

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
  //Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info.
});
```

## Options

### appId / apiKey

You will need to create an [`Algolia App`](https://www.algolia.com/doc/guides/getting-started/quick-start/) and search por the API Keys panel to get your `App Id` and `Admin API Key`. **The Admin API Key must remain private**

### indexName

This will be the name of the index in `Algolia`.

There are 2 ways of setting the `indexName` property

1. as a string

```js
YourSchema.plugin(mongooseAlgolia, {
  //other props...
  indexName: 'yourSchema',
  //other props...
});
```

2. as a function (dynamically)

```ts
characterSchema.plugin(algoliaIntegration<ICharacter>, {
  appId: process.env.ALGOLIA_APP_ID!,
  apiKey: process.env.ALGOLIA_API_KEY!,
  indexName: function (doc) {
    return `${doc.name}_characters`;
  },
});
```

This allows you to have multiple indexes splittet by some properties. Very handy in situations where you want to have a seperate index for each company or similar.

### selector

You can decide which field should be excluded or included by setting the `selector` property (same as in mongoose)

### populate

You can populate fields before sending them to `Algolia` by setting the populate property. (same as in mongoose, see [docs about population](http://mongoosejs.com/docs/api.html#document_Document-populate))

### defaults

You can set default values for fields that are blank in mongoose.
This is very useful in cases where you have documents with optional fields. Since it isn't possible to query `null` values in algolia, setting those fields to 'unknown' or 'notset' makes them searchable/filterable. _Currently you can't nest properties_

### mappings

If you want to modify your fields before sending it to algolia you can create mapping functions.

Let me show you an example:

Dataset:

```ts
  {
    name: {
      firstname: 'Peter',
      lastname: 'Griffin'
    }
  }
```

Now we dont want to store each field individually but as one string instead. We do it the following way:

```ts
mappings: {
  name: function(value) {
    return `${value.firstname} ${value.lastname}`;
  }
}
```

_Currently you can't nest properties_

### virtuals

If you need additional fields that are not part of your model, you can use virtuals to create any field you need.

Let me show you an example:

Dataset:

```ts
  {
    users: ['uid1','uid2'],
    groups: ['gid1','gid2']
  }
```

Now we dont want to store each field individually but as one array named `acl` instead. We do it the following way:

```js
virtuals: {
  acl: function(doc) {
    return [...doc.users, ...doc.groups];
  }
}
```

_You can't nest properties_

### filter

If you want to prevent some documents from being synced to algolia, you can do it by letting it go through the filter function.
The first property is the document.

Simply return true or false (same principle as Array.filter) in order to tell mongooose-algolia if you want to sync it or not.

_Hint_ You can enable softdeletion support:

```ts
filter: function(doc) {
  return !doc.active;
}
```

### debug

You can enable logging of all operations by setting `debug` to true

## Methods

### syncToAlgolia

Call this method if you want to sync all your documents with algolia (for single doc sync see **doc.ayncToAlgolia**)

This method clears the Algolia index for this schema and synchronizes all documents to Algolia (based on the settings defined in your plugin settings)

```ts
Model.ayncToAlgolia();
```

### setAlgoliaSettings

Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info about available parameters.

```ts
Model.aetAlgoliaSettings({
  searchableAttributes: ['name', 'properties', 'shows'],
});
```

### doc.ayncToAlgolia

doc = document from mongoose

Call this method if you want to sync your document to Algolia

```ts
doc.SyncToAlgolia();
```

### doc.removeFromAlgolia

doc = document from mongoose

Call this method if you want to remove your document from the Algolia index

```ts
doc.removeFromAlgolia();
```

## License

This library uses a base library under the MIT license created by Carsten Jacobsen on Nov 15, 2016 titled mongoose-algolia.

[The MIT License](http://opensource.org/licenses/MIT) Copyright (c) Avila Tek
