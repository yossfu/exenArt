import { test, expect } from '@playwright/test';
import path from 'path';

test('Subir imagen falsa', async ({ page }) => {
  await page.goto('/catboxupload.html');  // página de upload

  // Si requiere login, agrega pasos del test anterior

  // Sube una imagen fake (Playwright crea un archivo temporal)
  const filePath = path.resolve('tests/fake-image.jpg');  // crea un archivo dummy después
  await page.setInputFiles('input[type="file"]', {
    name: 'fake-art.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake image data')
  });

  await page.click('button:has-text("Subir")');

  await expect(page.locator('text=Subido correctamente')).toBeVisible({ timeout: 15000 });
});