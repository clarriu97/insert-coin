import { expect, test } from '@playwright/test';

test('touch controls drive a game on a phone viewport', async ({ page }) => {
    await page.goto('./#/play/demo');
    const controls = page.getByLabel('touch controls');
    await expect(controls).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();

    await controls.getByRole('button', { name: 'start' }).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await controls.getByRole('button', { name: 'action' }).tap();
    await expect(page.locator('.host-hud-field', { hasText: 'SCORE' }).locator('dd')).toHaveText('10');

    await controls.getByRole('button', { name: 'pause' }).tap();
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
});

test('snake fits the phone screen with controls', async ({ page }) => {
    await page.goto('./#/play/snake');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    const screen = page.getByLabel('SNAKE game screen');
    await expect.poll(async () => (await screen.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(240);
    const controls = await page.getByLabel('touch controls').boundingBox();
    const viewport = page.viewportSize();
    expect(controls && viewport).toBeTruthy();
    if (!controls || !viewport) return;
    expect(controls.y + controls.height).toBeLessThanOrEqual(viewport.height);

    for (const button of await page.getByLabel('touch controls').getByRole('button').all()) {
        const box = await button.boundingBox();
        expect(box && box.x >= 0 && box.x + box.width <= viewport.width).toBe(true);
    }
});
