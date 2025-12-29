import { test, expect } from '@playwright/test';

test('Página principal carga correctamente', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Tu título aquí/);  // Cambia por el título real de tu página
  // Aquí pondremos más pruebas después
});
