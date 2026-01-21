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
const istanbulCoverage = require('istanbul-lib-coverage');
// const istanbulReports = require('istanbul-reports');
// const istanbulLibReport = require('istanbul-lib-report');
const MCR = require('monocart-coverage-reports');

(async function mergeReports() {
  const map = istanbulCoverage.createCoverageMap();

  // 1. PATH DEFINITIONS
  const JEST_PATH = path.resolve(__dirname, '../coverage/coverage-final.json');
  // 🎯 Update this to match Monocart's actual output location
  const PW_PATH = path.resolve(__dirname, '../monocart-report/coverage/coverage-final.json');
  const OUTPUT_DIR = path.resolve(__dirname, '../coverage/unified-report');
  let mergedCount = 0;

  // 2. MERGE JEST DATA (UNIT LOGIC)
  if (fs.existsSync(JEST_PATH)) {
    console.log("📍 Merging Jest Unit Coverage...");
    try {
      map.merge(JSON.parse(fs.readFileSync(JEST_PATH, 'utf8')));
      mergedCount++;
    } catch (e) {
      console.error("❌ Error parsing Jest coverage:", e.message);
    }
  } else {
    console.warn("⚠️ Jest coverage not found at /coverage/coverage-final.json");
  }

  // 3. MERGE PLAYWRIGHT DATA (AUTHORITY/UI)
  if (fs.existsSync(PW_PATH)) {
    console.log("📍 Merging Playwright E2E Coverage...");
    try {
      map.merge(JSON.parse(fs.readFileSync(PW_PATH, 'utf8')));
      mergedCount++;
    } catch (e) {
      console.error("❌ Error parsing Playwright coverage:", e.message);
    }
  } else {
    console.warn("⚠️ Playwright coverage not found at /docs/test-results/coverage/coverage-final.json");
  }

  // 🧪 FAIL-SAFE LATCH: Check if we have files before summarizing
  const files = map.files();
  if (mergedCount === 0 || files.length === 0) {
    console.error("\n❌ [ABORTED] No valid coverage files were merged.");
    console.error("Ensure your tests ran successfully and generated JSON artifacts.\n");
    return;
  }

  console.log(`✨ Total files tracked in coverage map: ${files.length}`);

  // 4. GENERATE MONOCART UNIFIED HTML DASHBOARD
  async function generateMonocartUnified() {
    const mcr = MCR({
      name: "Parametric 2026 Unified Report",
      outputDir: path.join(process.cwd(), 'monocart-report'),
      outputFile: 'index.html', 
      
      // 🎯 THE CRITICAL FIX: Normalize paths so Jest and PW match
      sourcePath: (filePath) => {
          // Remove absolute paths and keep only from 'src' onwards
          if (filePath.includes('src')) {
              return filePath.substring(filePath.indexOf('src'));
          }
          return filePath;
      },

      reports: [
        ['html', { outputFile: 'index.html' }],
        ['console-summary'],
        ['istanbul', { subdir: 'coverage-details' }]
      ],
      sourceFilter: (sourcePath) => sourcePath.includes('src'),
    });

    // Load the data directly as objects to allow MCR to handle the heavy lifting
    if (fs.existsSync(JEST_PATH)) {
        const jestData = JSON.parse(fs.readFileSync(JEST_PATH, 'utf8'));
        await mcr.add(jestData);
    }
    
    if (fs.existsSync(PW_PATH)) {
        const pwData = JSON.parse(fs.readFileSync(PW_PATH, 'utf8'));
        await mcr.add(pwData);
    }

    await mcr.generate();
  }  
  
  await generateMonocartUnified();
    
  console.log(`✨ Total files tracked: ${files.length}`);

  // 5. CLEANUP
  const NYC_OUTPUT = path.resolve(__dirname, '../.nyc_output');
  if (fs.existsSync(NYC_OUTPUT)) {
      fs.rmSync(NYC_OUTPUT, { recursive: true, force: true });
      console.log("🧹 Cleaned up .nyc_output");
  }

  // 4. GENERATE ISTANBUL UNIFIED HTML DASHBOARD
  // try {
  //   const context = istanbulLibReport.createContext({
  //     dir: OUTPUT_DIR,
  //     // Change 'nested' to 'pkg' for better stability with mixed sources
  //     defaultSummarizer: 'pkg', 
  //     coverageMap: map // 🛡️ Explicitly pass the map into the context
  //   });

  //   const report = istanbulReports.create('html');
  //   // 🛡️ Pass the map directly to the execute call
  //   report.execute(context); 

  //   console.log(`\n✅ [SUCCESS] Unified Report generated at: ${OUTPUT_DIR}/index.html`);
  // } catch (err) {
  //   console.error("❌ Failed to generate HTML report:", err);
  // }
})();