import { expect, test } from '@playwright/test';

test('snake starts, keeps running, pauses and returns to the menu', async ({ page }) => {
    await page.goto('./#/play/snake');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);
    await expect(page.locator('.host-hud-field', { hasText: 'SCORE' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/$/);
});
