import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// 🟢 Standard ES Module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we are in coverage mode
const isCoverage = process.env.VITE_COVERAGE === 'true';
const is3DHeavy = process.argv.some(arg => arg.includes('smoke') || arg.includes('Visual') || arg.includes('hud'));

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/*.test.js', // [cite: 2026-01-18] FIX: Ignore Jest unit tests to prevent runner collision
  workers: is3DHeavy ? 1 : (process.env.CI ? 2 : undefined),
  fullyParallel: !is3DHeavy,

  reporter: [
    ['list'],
    ['monocart-reporter', {  
        name: "Parametric 2026 Unified Report",
        outputDir: path.resolve(__dirname, 'monocart-report'),
        coverage: {
            // Use Istanbul provider when VITE_COVERAGE is true
            provider: isCoverage ? 'istanbul' : 'v8', 
            entryFilter: (entry) => entry.url.includes('src'),
            sourceFilter: (sourcePath) => sourcePath.includes('src'),
            all: true, 
            lcov: true, 
            reports: [
                'v8',
                ['console-summary'],
                ['istanbul', {
                    file: 'coverage-final.json',
                    dir: 'coverage' 
                }]
            ]
        }
    }]
  ],
  use: {
    // 🟠 ALIGNMENT: Ensure the port matches your Vite 'npm start' (3000)
    baseURL: 'http://localhost:3000/parametric/', 
    trace: 'on-first-retry',
    onConsole: (msg) => console.log(`[BROWSER] ${msg.text()}`),
  },

webServer: {
    command: isCoverage ? 'VITE_COVERAGE=true npm run start' : 'npm run start',
    url: 'http://localhost:3000/parametric/',
    // 🟢 THE FIX: In CI, we reuse the server started by start-server-and-test
    reuseExistingServer: true, 
    timeout: 120 * 1000,
    stderr: 'pipe',
    stdout: 'pipe',
  },
});