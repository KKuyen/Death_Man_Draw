import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve:{alias:{
    '@saloon/protocol':fileURLToPath(new URL('../protocol/src/index.ts',import.meta.url)),
    '@saloon/content':fileURLToPath(new URL('../content/src/index.ts',import.meta.url)),
  }},
  test:{include:['packages/rules/**/*.test.ts','packages/content/**/*.test.ts'],environment:'node'},
});
