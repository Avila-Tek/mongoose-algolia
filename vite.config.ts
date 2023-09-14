/* eslint-disable import/no-extraneous-dependencies */
/// <reference types="vitest" />
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'at-mongoose-algolia',
      fileName: 'at-mongoose-algolia',
    },
  },
  plugins: [
    dts({
      outDir: './dist',
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  test: {
    setupFiles: ['dotenv/config'],
    globals: true,
  },
});
