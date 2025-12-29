import { test, expect } from '@playwright/test';

test('Likes, comentarios y follows con usuario falso', async ({ page }) => {
  await page.goto('/feed.html');

  // Dar like a la primera publicación
  await page.click('.like-button:first-child');  // adapta el selector (inspecciona elemento)
  await expect(page.locator('.like-count')).toHaveText(/1/i);  // verifica que aumente

  // Comentar
  await page.fill('textarea[placeholder="Escribe un comentario"]', 'Comentario de prueba automatizada 😎');
  await page.click('button:has-text("Enviar")');
  await expect(page.locator('text=Comentario de prueba automatizada')).toBeVisible();

  // Follow a un usuario
  await page.goto('/profile.html');  // o perfil de otro usuario
  await page.click('text=Seguir');
  await expect(page.locator('text=Siguiendo')).toBeVisible();
});