import { expect, test } from '@playwright/test';

test('the idle menu cycles attract slides and any input returns to it', async ({ page }) => {
    await page.clock.install();
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'SELECT GAME' })).toBeVisible();

    await page.clock.runFor(20_000);
    await expect(page.getByRole('region', { name: 'title' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SELECT GAME' })).toHaveCount(0);

    await page.clock.runFor(5_000);
    await expect(page.getByRole('region', { name: 'SNAKE high scores' })).toContainText('BE THE FIRST');

    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('heading', { name: 'SELECT GAME' })).toBeVisible();
    await expect(page.locator('.menu-item').first()).toHaveAttribute('aria-current', 'true');
});

test('activity keeps the menu out of attract mode', async ({ page }) => {
    await page.clock.install();
    await page.goto('./');
    await page.clock.runFor(15_000);
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(15_000);
    await expect(page.getByRole('heading', { name: 'SELECT GAME' })).toBeVisible();
});
