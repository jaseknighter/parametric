  import { defineConfig, devices } from '@playwright/test';
  import path from 'path';
  import fs from 'fs';
  import { fileURLToPath } from 'url';
  import { summarizeShards } from './scripts/summarizeShards.js'; // We will create this

  // 🟢 Standard ES Module replacement for __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  function ts() {
    return new Date().toISOString();
  }

  // Check if we are in coverage mode
  const isCoverage = process.env.VITE_COVERAGE === 'true';
  const is3DHeavy = process.argv.some(arg => arg.includes('smoke') || arg.includes('Visual') || arg.includes('hud'));

  export default defineConfig({
    testDir: './tests',
    testIgnore: '**/*.test.js', // [cite: 2026-01-18] FIX: Ignore Jest unit tests to prevent runner collision
    workers: is3DHeavy ? 1 : (process.env.CI ? 1 : 3),
      fullyParallel: !is3DHeavy,
      timeout: process.env.CI ? 120000 : 60000, // 🟢 Double timeout in CI (2m)
      expect: {
      timeout: process.env.CI ? 15000 : 5000, // 🟢 Extra breathing room for slow CI renders
      toHaveScreenshot: {
        // [cite: 2026-01-23] CI TOLERANCE: Allow 10% pixel diff in CI (Software Rendering) vs 2% locally
        maxDiffPixelRatio: process.env.CI ? 0.1 : 0.02,
        threshold: 0.2,                        // Sensitivity to color shifts
      },
    },
    reporter: [
      ['list'],
      ['html', { 
        outputFolder: 'playwright-report', 
        open: 'never' 
      }],
      ['json', { outputFile: 'playwright-report.json' }],
      ['monocart-reporter', {  
        name: "Parametric Unified Coverage (Jest + Playwright)",
        outputDir: path.resolve(__dirname, 'monocart-report'),
        coverage: {
          provider: 'istanbul',
          saveJson: true,                  // keep this true
          coverageDir: path.resolve(__dirname, 'monocart-report/coverage'),
          cleanCache: false,               // prevent Monocart from deleting JSON shards
          verbose: true, // 🔍 log shard collection internally
          onEnd: async (results, coverageReport) => {
            console.log('\n--- 🧪 SHARD SUMMARY ---');
            
            // 🟢 1. The Settle Guard: Wait for OS file descriptors to close
            await new Promise(resolve => setTimeout(resolve, 500));

            // 🟢 2. Point to the specific coverage sub-folder
            const actualShardDir = path.resolve(__dirname, 'raw-shards');
            
            // 🟢 3. Await the async summary
            await summarizeShards(actualShardDir);
          },
          hooks: {
            'coverage:write': ({ filePath, size }) => {
              console.log(`🕒 [${ts()}] 💾 [Shard Flush] Writing file: ${filePath} | size: ${size} bytes`);
            },
            'coverage:flush': () => {
              console.log(`🕒 [${ts()}] 🔄 [Coverage Flush] Monocart flushing in-memory coverage`);
            }
          },
          reports: [
            // ✅ Human-readable summary
            ['console-summary'],
            ['html', { 
              outputDir: path.resolve(__dirname, 'monocart-report/coverage') 
            }],
            // ✅ Machine-readable JSON shard
            ['istanbul', {
              outputDir: path.resolve(__dirname, 'monocart-report/coverage'),
              file: '[projectName].json'
            }]
          ]
        }
      }]
    ],
    use: {
      // 🟠 ALIGNMENT: Ensure the port matches your Vite 'npm start' (3000)
      baseURL: 'http://localhost:3000/parametric/', 
      trace: 'on',
      onConsole: (msg) => console.log(`[BROWSER] ${msg.text()}`),
      collectCoverage: true, // 🟢 Harvest the data from the browser
      contextOptions: {
        // Ensure the browser doesn't clear the memory too early
        ignoreHTTPSErrors: true,
      },
      // 🟢 FORCE ENV FOR COVERAGE
      env: {
        ...process.env,
        VITE_COVERAGE: 'true'
      }
    },

    projects: [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] },
      },
      // 🟢 CI OPTIMIZATION: Only run Firefox locally or if explicitly requested.
      // This prevents the "Firefox Wall" from blocking your baseline generation.
      ...(process.env.CI ? [] : [{
        name: 'firefox',
        use: { 
          ...devices['Desktop Firefox'],
          actionTimeout: 15000,
          navigationTimeout: 30000,
        },
      }]),
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
    ],

    webServer: {
      command: 'cross-env VITE_COVERAGE=true npm run start -- --force',
      url: 'http://localhost:3000/parametric/',
      // 🟢 THE FIX: In CI, we reuse the server started by start-server-and-test
      reuseExistingServer: true, 
      timeout: 120 * 1000,
      stderr: 'pipe',
      stdout: 'pipe',
    },
  });