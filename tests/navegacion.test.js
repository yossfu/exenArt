import { test, expect } from '@playwright/test';

test('Navegación por menús y páginas principales', async ({ page }) => {
  await page.goto('/');

  // Verifica página principal
  await expect(page).toHaveTitle(/exen-E|exenArt/i);

  // Clic en enlaces del menú (adapta si los textos son diferentes)
  await page.click('text=Para Ti');
  await expect(page).toHaveURL(/.*feed.html/);  // o la URL que corresponda

  await page.click('text=Explorar');
  await page.click('text=Tendencias');

  // Prueba categorías
  await page.goto('/anime.html');
  await expect(page.locator('h1, title')).toContainText(/anime/i);

  await page.goto('/furry.html');
  await page.goto('/realismo.html');
  await page.goto('/comunidad.html');

  // Más páginas
  await page.goto('/profile.html');
  await page.goto('/login.html');
});