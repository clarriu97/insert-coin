import { expect, test, type Page } from '@playwright/test';

const score = (page: Page) => page.locator('.host-hud-field', { hasText: 'SCORE' }).locator('dd');

async function setVisibility(page: Page, state: DocumentVisibilityState) {
    await page.evaluate((value) => {
        Object.defineProperty(document, 'visibilityState', { value, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
    }, state);
}

test('game host runs the ready, playing, paused and over phases', async ({ page }) => {
    await page.goto('./#/play/demo');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.press('Space');
    await expect(score(page)).toHaveText('10');

    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.press('KeyZ');
    await expect(page.getByRole('dialog', { name: 'new high score' })).toContainText('SCORE 10');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');

    const over = page.getByRole('dialog', { name: 'over' });
    await expect(over).toContainText('SCORE 10');
    await expect(over.getByRole('list', { name: 'high scores' })).toContainText('BAA');

    await page.keyboard.press('Enter');
    await expect(over).toBeVisible();

    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(score(page)).toHaveText('0');

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#\/$/);
});

test('hiding the tab pauses the game and it can be resumed', async ({ page }) => {
    await page.goto('./#/play/demo');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await setVisibility(page, 'hidden');
    await expect(page.getByRole('dialog', { name: 'paused' })).toBeVisible();

    await setVisibility(page, 'visible');
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('Space');
    await expect(score(page)).toHaveText('10');
});

test('unknown games redirect to the menu', async ({ page }) => {
    await page.goto('./#/play/nope');
    await expect(page.getByRole('heading', { name: 'INSERT COIN' })).toBeVisible();
});

test('hidden games are not listed in the menu', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('button', { name: /TEST PATTERN/ })).toHaveCount(0);
});

test('high scores persist and only qualifying scores ask for initials', async ({ page }) => {
    await page.goto('./#/play/demo');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('Space');
    await expect(score(page)).toHaveText('10');
    await page.keyboard.press('Space');
    await expect(score(page)).toHaveText('20');
    await page.keyboard.press('KeyZ');
    await expect(page.getByRole('dialog', { name: 'new high score' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'over' })).toContainText('AAA');

    await page.reload();
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.host-hud-field', { hasText: 'HI' }).locator('dd')).toHaveText('20');

    await page.keyboard.press('KeyZ');
    await expect(page.getByRole('dialog', { name: 'over' })).toContainText('SCORE 0');
    await expect(page.getByRole('dialog', { name: 'new high score' })).toHaveCount(0);
});
