import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.{ts,tsx}'],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            include: ['src/engine/**/*.ts', 'src/games/**/logic.ts'],
            exclude: ['**/*.test.ts', 'src/engine/types.ts'],
            thresholds: {
                lines: 85,
                branches: 85,
                functions: 85,
                statements: 85
            }
        }
    }
});
