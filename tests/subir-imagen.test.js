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












#(letterboxed:1.000)
#(abs:1.000)
#(blue_skin:1.000)
#(flower:1.000)
#(pubic_hair:1.000)
#(blue_flower:0.999)
#(pointy_ears:0.998)
#(muscular:0.998)
#(male_focus:0.997)
#(penis:0.995)
#(colored_skin:0.993)
#(jewelry:0.993)
#(toned:0.985)
#(blue_butterfly:0.982)
#(pillarboxed:0.982)
#(male_pubic_hair:0.981)
#(testicles:0.980)
#(butterfly:0.980)
#(uncensored:0.979)
#(muscular_female:0.977)
#(bug:0.976)
#(blue_rose:0.975)
#(rating:explicit:0.973)
#(rose:0.971)
#(female_pubic_hair:0.967)
#(necklace:0.963)
#(black_border:0.935)
#(solo:0.906)
#(toned_male:0.872)
#(pectorals:0.865)
#(nipples:0.842)
#(erection:0.825)
#(long_hair:0.799)
#(elf:0.792)
#(plant:0.768)
#(leaf:0.754)
#(navel:0.713)
#(earrings:0.701)
#(orange_hair:0.696)
#(looking_at_viewer:0.647)
#(foreskin:0.540)
#(orange_eyes:0.526)
#(purple_flower:0.524)
#(blush:0.522)
#(colored_pubic_hair:0.515)