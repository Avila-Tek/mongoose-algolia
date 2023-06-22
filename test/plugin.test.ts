import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { connect, close } from './db';
import { Character } from './models/Character';
import { Show } from './models/Show';
import sampleData from './sampleData.json';

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await close();
});

describe('Mongoose Algolia Plugin', () => {
  it('init-plugin', async () => {
    try {
      const shows = await Promise.all(
        sampleData.map((data) =>
          Show.create({
            name: data.name,
            genre: data.genre,
          })
        )
      );
      const characters = await Promise.all(
        sampleData
          .map((data) => {
            const show = shows.find((s) => s.name === data.name);
            return data.characters.map((character) =>
              Character.create({
                name: character.name,
                properties: character.properties,
                shows: [show?._id],
                parents: {
                  mother: character.parents ? character.parents.mother : null,
                  father: character.parents ? character.parents.father : null,
                },
              })
            );
          })
          .flat(2)
      );
      expect(shows.length).toBe(2);
      expect(characters.length).toBe(5);
    } catch (err) {
      console.log(err);
    }
  });

  it('sync', async () => {
    try {
      await Character.syncToAlgolia();
    } catch (err) {
      console.log(err);
    }
  });

  it('individual-sync', async () => {
    const docs = await Character.find().exec();
    await Promise.all(docs.map((doc) => (doc as any).syncToAlgolia()));
  });

  it('udpated', async () => {
    const shows = await Show.find().exec();
    const characters = await Character.find().exec();

    await Promise.all(
      shows.map((show) => {
        show.counter += 1;
        return show.save();
      })
    );
    await Promise.all(
      characters.map((character) => {
        character.counter += 1;
        return character.save();
      })
    );
  });

  it('remove-from-algolia', async () => {
    const characters = await Character.find().exec();
    await Promise.all(
      characters.map((character) => (character as any).removeFromAlgolia())
    );
  });

  it('remove', async () => {
    const characters = await Character.find().exec();
    const shows = await Show.find().exec();
    await Promise.all(characters.map((character) => character.deleteOne()));
    await Promise.all(shows.map((show) => show.deleteOne()));
  });
});