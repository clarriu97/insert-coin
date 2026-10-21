import { expect, test } from '@playwright/test';
import { GAMES } from '../src/games/registry.ts';

for (const game of GAMES.filter((entry) => !entry.hidden)) {
    test(`${game.title} starts, pauses, resumes and exits from the menu`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('./');
        await page.getByRole('button', { name: game.title }).click();
        await expect(page).toHaveURL(new RegExp(`#/play/${game.id}$`));

        await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await page.keyboard.press('KeyP');
        await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();
        await page.keyboard.press('KeyP');
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await page.keyboard.press('Escape');
        await expect(page.getByRole('heading', { name: 'INSERT COIN' })).toBeVisible();
        expect(errors).toEqual([]);
    });
}
