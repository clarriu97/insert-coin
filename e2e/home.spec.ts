import { expect, test } from '@playwright/test';

test('home lists the games and opens the selected one', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'INSERT COIN' })).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#\/play\/snake$/);
    await expect(page.getByRole('dialog', { name: 'ready' })).toContainText('SNAKE');
});
