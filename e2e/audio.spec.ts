import { expect, test } from '@playwright/test';

test('the mute button toggles its state and label in the menu', async ({ page }) => {
    await page.goto('./');
    const toggle = page.getByRole('button', { name: 'SOUND' });
    await expect(toggle).toHaveText('SOUND ON');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect(toggle).toHaveText('SOUND OFF');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveText('SOUND ON');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

test('M toggles the sound in a game and the choice survives a reload', async ({ page }) => {
    await page.goto('./#/play/snake');
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    const toggle = page.getByRole('button', { name: 'SOUND' });
    await expect(toggle).toHaveText('SOUND ON');

    await page.keyboard.press('KeyM');
    await expect(toggle).toHaveText('SOUND OFF');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await expect(page.getByRole('dialog', { name: 'ready' })).toBeVisible();
    await expect(toggle).toHaveText('SOUND OFF');

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('KeyM');
    await expect(toggle).toHaveText('SOUND ON');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await page.goto('./');
    await expect(page.getByRole('button', { name: 'SOUND' })).toHaveText('SOUND ON');
});
