/**
 * @fileoverview merge-coverage.cjs
 * UNIFIED COVERAGE AGGREGATOR (2026 BASELINE)
 * * ROLE: Fuses Unit Test data (Jest) with E2E Browser data (Playwright/Istanbul).
 * PURPOSE: Eliminates "Dark Spots" by merging execution counters from 
 * isolated environments into a single "Seal of Quality" report.
 * * INSTRUCTIONS:
 * 1. Run Jest: `npm test -- --coverage`
 * 2. Start Instrumented Server: `VITE_COVERAGE=true npm start`
 * 3. Run Playwright: `npx playwright test`
 * 4. Execute: `node scripts/merge-coverage.cjs`
 */


const fs = require('fs');
const path = require('path');
const MCR = require('monocart-coverage-reports');

function ts() {
  return new Date().toISOString();
}

console.log('\n🔍 --- STARTING COVERAGE MERGE VERIFICATION ---');

(async function mergeReports() {
  // 1. PATH DEFINITIONS
  const JEST_PATH = path.resolve(__dirname, '../coverage/coverage-final.json');
  // 🟢 ALIGNMENT: Match the path established in playwright.config.js
  const PW_COVERAGE_DIR = path.resolve(__dirname, '../raw-shards');
  
  // 2. THE SETTLE GUARD (Wait for OS to release file handles)
  console.log("🕒 Waiting 1s for OS to flush JSON shards to disk...");
  await new Promise(res => setTimeout(res, 1000));

  // 3. VERIFY INPUTS
  const hasJest = fs.existsSync(JEST_PATH);
  const shards = fs.existsSync(PW_COVERAGE_DIR) 
    ? fs.readdirSync(PW_COVERAGE_DIR).filter(f => f.endsWith('.json') && !f.includes('summary'))
    : [];

  console.log(`📡 Jest Coverage: ${hasJest ? '✅ FOUND' : '❌ MISSING'}`);
  console.log(`📡 Playwright Shards: ${shards.length > 0 ? `✅ ${shards.length} FOUND` : '❌ NONE'}`);

  if (!hasJest && shards.length === 0) {
      console.error("\n❌ [ABORTED] No valid coverage files found.");
      return;
  }

  // 3. GENERATE MONOCART UNIFIED HTML DASHBOARD
  console.log('\n💾 Generating Monocart Unified Report...');
  const mcr = MCR({
      name: "Parametric 2026 Unified Report",
      outputDir: path.join(process.cwd(), 'monocart-report'),
      
      // 🟢 PATH FUSION: Ensures /Users/x/src matches src/ in the final report
      sourcePath: (filePath) => {
          if (filePath.includes('src/')) {
              return filePath.substring(filePath.indexOf('src/'));
          }
          return filePath;
      },

      reports: [
        ['html', { outputFile: 'index.html' }],
        ['console-summary'],
        ['json-summary', { file: 'coverage-summary.json' }]
      ],
      sourceFilter: (sourcePath) => sourcePath.includes('src/'),
  });

  // Add Jest Data
  if (hasJest) {
      const jestData = JSON.parse(fs.readFileSync(JEST_PATH, 'utf8'));
      await mcr.add(jestData);
      console.log('   ➕ Added Jest data.');
  }
  
  // Add Playwright Data
  for (const file of shards) {
      const fullPath = path.join(PW_COVERAGE_DIR, file);
      try {
        const pwData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        // 🟢 KEY FIX: Normalize shard keys to absolute paths so they "snap" to the Jest data
        const normalizedData = {};
        Object.keys(pwData).forEach(key => {
            let absoluteKey = key;
            if (key.includes('src/')) {
                const relativePath = key.substring(key.indexOf('src/'));
                absoluteKey = path.resolve(process.cwd(), relativePath);
            }
            normalizedData[absoluteKey] = pwData[key];
        });

        await mcr.add(normalizedData);
        console.log(`   ➕ Added Shard: ${file}`);
      } catch (e) {
        console.error(`   ❌ Error adding shard ${file}:`, e.message);
      }
  }

  await mcr.generate();
  console.log('\n🚀 --- MERGE COMPLETE --- \n');
})();