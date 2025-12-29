import { test, expect } from '@playwright/test';

test('Registro, login y edición de perfil con usuario falso', async ({ page }) => {
  const fakeUser = {
    username: 'tester' + Date.now(),  // único cada vez
    email: 'testerfake' + Date.now() + '@example.com',
    password: 'Test123456!',
    bio: 'Usuario de prueba automatizada 🚀'
  };

  // Registro (adapta selectores si son diferentes)
  await page.goto('/login.html');  // o la página con formulario de registro
  await page.click('text=Crear Cuenta');  // si hay botón para registro

  await page.fill('input[placeholder="Nombre de usuario"]', fakeUser.username);  // adapta placeholder o name
  await page.fill('input[type="email"]', fakeUser.email);
  await page.fill('input[type="password"]', fakeUser.password);
  await page.click('button:has-text("Registrarse")');

  // Verifica que redirija o muestre éxito
  await expect(page.locator('text=Bienvenido')).toBeVisible({ timeout: 10000 });

  // Editar perfil
  await page.goto('/profile.html');
  await page.click('text=Editar Perfil');
  await page.fill('textarea[name="bio"]', fakeUser.bio);
  await page.click('text=Guardar');

  await expect(page.locator('text=' + fakeUser.bio)).toBeVisible();
});