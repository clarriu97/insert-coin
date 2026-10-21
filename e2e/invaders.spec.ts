import { expect, test } from '@playwright/test';

test('invaders starts, keeps running, pauses and returns to the menu', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('./#/play/invaders');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('Space');
    await page.waitForTimeout(500);
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.up('ArrowRight');

    await expect(page.locator('.host-hud-field', { hasText: 'WAVE' })).toBeVisible();
    await expect(page.locator('.host-hud-field', { hasText: 'LIVES' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/$/);
    expect(errors).toEqual([]);
});
