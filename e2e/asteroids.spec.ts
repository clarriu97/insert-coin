import { expect, test } from '@playwright/test';

test('asteroids starts, flies and fires, pauses and returns to the menu', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('./#/play/asteroids');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowLeft');
    for (let shot = 0; shot < 5; shot++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(100);
    }
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowUp');

    await expect(page.locator('.host-hud-field', { hasText: 'SCORE' })).toBeVisible();
    await expect(page.locator('.host-hud-field', { hasText: 'LIVES' })).toBeVisible();
    await expect(page.locator('.host-hud-field', { hasText: 'WAVE' })).toBeVisible();

    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/$/);
    expect(errors).toEqual([]);
});
