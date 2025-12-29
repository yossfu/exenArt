import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'baseURL: 'https://yossfu.github.io/exenArt/',  // ¡Cambia esto por tu URL real!
    headless: true,
  },
});
