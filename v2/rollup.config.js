import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    sourcemap: true,
    banner: '#!/usr/bin/env node'
  },
  plugins: [
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false
    }),
    resolve({
      preferBuiltins: true
    }),
    commonjs()
  ],
  external: [
    'node:fs',
    'node:fs/promises',
    'node:path',
    'node:crypto',
    'node:util'
  ]
};
