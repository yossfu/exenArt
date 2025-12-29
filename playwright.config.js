import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'https://tu-usuario.github.io/tu-repo/',  // ¡Cambia esto por tu URL real!
    headless: true,
  },
});
