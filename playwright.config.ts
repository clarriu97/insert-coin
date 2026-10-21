import { defineConfig, devices } from '@playwright/test';

const port = 4317;
const basePath = '/insert-coin/';

export default defineConfig({
    testDir: 'e2e',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: `http://localhost:${port}${basePath}`,
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /touch\.spec\.ts/ },
        { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /touch\.spec\.ts/ }
    ],
    webServer: {
        command: `pnpm exec vite preview --port ${port} --strictPort`,
        port,
        env: { VITE_BASE_PATH: basePath },
        reuseExistingServer: !process.env.CI
    }
});
