import { expect, test } from '@playwright/test';

test('home lists the games and opens the selected one', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'INSERT COIN' })).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#\/snake$/);
    await expect(page.getByRole('heading', { name: 'SNAKE' })).toBeVisible();
});
