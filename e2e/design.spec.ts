import { expect, test } from '@playwright/test';

test('fonts are self-hosted', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
        if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) {
            external.push(request.url());
        }
    });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'INSERT COIN' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(external).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check('16px "Press Start 2P"'))).toBe(true);
});

test('reduced motion turns off CRT flicker and blinking', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    const animations = await page.evaluate(() => [
        getComputedStyle(document.querySelector('.crt') as Element, '::after').animationName,
        getComputedStyle(document.querySelector('.menu-footer') as Element).animationName
    ]);
    expect(animations).toEqual(['none', 'none']);
});

test('the menu is keyboard and mouse navigable', async ({ page }) => {
    await page.goto('./');
    const items = page.locator('.menu-item');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await expect(items.nth(1)).toHaveAttribute('aria-current', 'true');
    await items.first().hover();
    await expect(items.first()).toHaveAttribute('aria-current', 'true');
});
