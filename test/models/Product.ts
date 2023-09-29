import { Document, Model, Schema, Types, model } from 'mongoose';
import { algoliaIntegration } from '../../src';

type TStaticMethods = {
  syncToAlgolia(): Promise<void>;
  setAlgoliaSettings(settings: any): void;
};

export type MeasurementTypeEnum = 'unit' | 'weight';

export type StatusEnum = 'active' | 'archived' | 'draft';

export interface IProduct {
  _id?: any;
  title: string;
  slug?: string;
  description: string;
  categories: Array<Types.ObjectId>;
  priority?: number;
  rating?: number;
  points?: number;
  reviews?: number;
  comments?: Array<Types.ObjectId>;
  photos?: Array<any>;
  measurementType: MeasurementTypeEnum;
  volatileInventory?: boolean;
  sku: string;
  stock: number;
  ignoreStock: boolean;
  price: number;
  compareAtPrice: number;
  isGiftCard?: boolean;
  extraInfo?: Array<any>;
  taxes?: Array<Types.ObjectId>;
  tags?: Array<string>;
  packaged?: boolean;
  status?: StatusEnum;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductModel = Model<IProduct> & TStaticMethods;

export type ProductDocument = Document<Types.ObjectId, any, IProduct> &
  IProduct;

const productSchema = new Schema<IProduct, ProductModel, TStaticMethods>(
  {
    title: {
      type: String,
      trim: true,
      required: [true, 'Por favor ingrese un nombre de producto'],
    },
    slug: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        // ref: 'Category',
      },
    ],
    priority: {
      type: Number,
    },
    rating: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    packaged: {
      type: Boolean,
      default: true,
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        // ref: 'Comment',
        default: [],
      },
    ],
    photos: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    measurementType: {
      type: String,
      enum: ['unit', 'weight'],
    },
    volatileInventory: {
      type: Boolean,
      default: false,
    },
    sku: {
      type: String,
      trim: true,
      unique: true,
    },
    stock: {
      type: Number,
    },
    ignoreStock: {
      type: Boolean,
    },
    price: {
      type: Number,
    },
    compareAtPrice: {
      type: Number,
    },
    isGiftCard: {
      type: Boolean,
      default: false,
    },
    extraInfo: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    tags: {
      type: [String],
      trim: true,
    },
    taxes: [
      {
        type: Schema.Types.ObjectId,
        // ref: 'Tax',
        default: [],
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productSchema.plugin(algoliaIntegration, {
  appId: process.env.ALGOLIA_APP_ID!,
  apiKey: process.env.ALGOLIA_API_KEY!,
  indexName: 'products',
  selector: '-createdAt -updatedAt',
  populate: {
    path: 'categories',
    select: 'name',
  },
  virtuals: {
    statusType: (doc) => (doc?.active ? 'Activo' : 'Inhabilitado'),
  },
  mappings: {
    sku: (doc) => `#${doc?.sku}`,
  },
  debug: true,
});

export const Product = model<IProduct, ProductModel>('Product', productSchema);

Product.setAlgoliaSettings({
  searchableAttributes: [
    'sku',
    'name',
    'price',
    'compareAtPrice',
    'statusType',
  ],
  attributesForFaceting: [
    'categories',
    'categories.name',
    'measurementType',
    'tags',
    'isGiftCard',
  ],
  ranking: ['desc(points)', 'asc(price)', 'desc(price)'],
});

Product.syncToAlgolia().then((x) => console.log(x));
