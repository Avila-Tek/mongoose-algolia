import { Schema, model } from 'mongoose';

interface IShow {
  name: string;
  genre: string[];
  counter: number;
}

const showSchema = new Schema<IShow>({
  name: String,
  genre: [String],
  counter: {
    type: Number,
    default: 1,
  },
});

export const Show = model('Show', showSchema);
