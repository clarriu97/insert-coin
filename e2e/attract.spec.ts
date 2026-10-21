import { expect, test } from '@playwright/test';

test('the idle menu cycles attract slides and any input returns to it', async ({ page }) => {
    await page.clock.install();
    await page.goto('./');
    const attract = page.locator('.attract');
    await expect(page.getByRole('heading', { name: 'SELECT GAME' })).toBeVisible();

    await page.clock.runFor(20_000);
    await expect(attract.locator('.attract-title')).toBeVisible();
    await expect(attract).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.menu-item').first()).toBeFocused();

    await page.clock.runFor(5_000);
    await expect(attract.locator('.attract-scores')).toContainText('BE THE FIRST');

    await page.keyboard.press('ArrowDown');
    await expect(attract).toHaveCount(0);
    await expect(page.locator('.menu-item').first()).toHaveAttribute('aria-current', 'true');
});

test('a tap that wakes the cabinet does not also press a button', async ({ page }) => {
    await page.clock.install();
    await page.goto('./');
    await page.clock.runFor(20_000);
    await expect(page.locator('.attract')).toBeVisible();

    const toggle = page.getByRole('button', { name: 'SOUND' });
    await toggle.dispatchEvent('pointerdown');
    await toggle.dispatchEvent('click');
    await expect(page.locator('.attract')).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

test('activity keeps the menu out of attract mode', async ({ page }) => {
    await page.clock.install();
    await page.goto('./');
    await page.clock.runFor(15_000);
    await page.keyboard.press('ArrowDown');
    await page.clock.runFor(15_000);
    await expect(page.locator('.attract')).toHaveCount(0);
});

test('reduced motion disables attract mode', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await page.goto('./');
    await page.clock.runFor(30_000);
    await expect(page.locator('.attract')).toHaveCount(0);
});
