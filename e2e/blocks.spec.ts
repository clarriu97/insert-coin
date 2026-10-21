import { expect, test } from '@playwright/test';

test('blocks starts, scores hard drops, pauses and returns to the menu', async ({ page }) => {
    const score = page.locator('.host-hud-field', { hasText: 'SCORE' }).locator('dd');

    await page.goto('./#/play/tetris');
    await expect(page.getByRole('dialog', { name: 'ready' })).toContainText('BLOCKS');

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(score).toHaveText('0');

    for (let drop = 0; drop < 3; drop++) {
        await page.keyboard.press('Space');
    }
    await expect(score).not.toHaveText('0');

    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/$/);
});
