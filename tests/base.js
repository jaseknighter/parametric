import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function ts() {
  return new Date().toISOString();
}

/**
 * Flush the coverage for a single test to disk.
 * Each shard is named by project + test title.
 */
function persistCoverage(testInfo, coverage, projectName) {
  if (!coverage || Object.keys(coverage).length === 0) {
    console.warn(`[DEBUG] ❌ Coverage empty for test: ${testInfo.title}`);
    return;
  }

  const coverageDir = path.resolve(process.cwd(), 'raw-shards');
  if (!fs.existsSync(coverageDir)) fs.mkdirSync(coverageDir, { recursive: true });

  // Sanitize filename
  const safeTitle = testInfo.title.replace(/\W+/g, '_').slice(0, 50);
  const shardFile = path.join(coverageDir, `${projectName}__${safeTitle}.json`);

  fs.writeFileSync(shardFile, JSON.stringify(coverage, null, 2), 'utf-8');
  console.log(`[DEBUG] ✅ Coverage shard written: ${shardFile} | files=${Object.keys(coverage).length}`);
}

export const test = base.extend({
  page: async ({ page, context }, use, testInfo) => {
    await use(page);

    // Run this AFTER the test
    const coverage = await page.evaluate(() => window.__coverage__ || {});
    
    if (coverage && Object.keys(coverage).length > 0) {
      const fileCount = Object.keys(coverage).length;
      console.log(`🕒 [${new Date().toISOString()}] 🧩 [Browser] Coverage detected: ${fileCount} files in memory.`);
    } else {
      console.warn(`🕒 [${new Date().toISOString()}] ❌ [Browser] No __coverage__ found for test: ${testInfo.title}`);
    }

    // Persist immediately after the test
    persistCoverage(testInfo, coverage, testInfo.project.name);
  },
});