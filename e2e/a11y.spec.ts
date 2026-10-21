import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('the menu has no WCAG AA violations', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'SELECT GAME' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});

test('a game screen with its overlay has no WCAG AA violations', async ({ page }) => {
    await page.goto('./#/play/snake');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).withTags(WCAG_AA).exclude('canvas').analyze();
    expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
});
