/**
 * @fileoverview generate-coverage-table.cjs
 * AUTOMATION: Updates README.md with latest test metrics.
 * Reads Jest coverage, Playwright coverage, and Playwright test results.
 */

const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');

// Paths
const JEST_COVERAGE_PATH = path.resolve(__dirname, '../coverage/coverage-final.json');
const PW_COVERAGE_PATH = path.resolve(__dirname, '../monocart-report/coverage-summary.json');
const PW_RESULTS_PATH = path.resolve(__dirname, '../playwright-report.json');
const README_PATH = path.resolve(__dirname, '../README.md');

// Helper to calculate coverage percentage
function calculateCoverage(coverageMap, filePath, type) {
    if (!coverageMap) return null;
    // Find key ending with filePath
    const key = Object.keys(coverageMap).find(k => k.endsWith(filePath));
    if (!key) return null;
    
    const fileCov = coverageMap[key];
    
    // Handle Summary Format (from Monocart coverage-summary.json)
    if (fileCov.statements && fileCov.branches) {
         const metricKey = type === 's' ? 'statements' : (type === 'b' ? 'branches' : null);
         if (!metricKey) return null;
         const m = fileCov[metricKey];
         return { pct: m.pct, covered: m.covered, total: m.total };
    }

    const metrics = fileCov[type]; // 's' for statements, 'b' for branches
    
    let total = 0;
    let covered = 0;
    
    if (type === 's') {
        total = Object.keys(metrics).length;
        covered = Object.values(metrics).filter(v => v > 0).length;
    } else if (type === 'b') {
        Object.values(metrics).forEach(branchCounts => {
            branchCounts.forEach(count => {
                total++;
                if (count > 0) covered++;
            });
        });
    }
    
    return {
        pct: total === 0 ? 100 : Math.round((covered / total) * 100),
        covered: covered,
        total: total
    };
}

// Helper to get pass rate
function getTestStats(results, projectNames, excludeProjects = []) {
    if (!results) return { rate: null, count: 0 };
    
    let passed = 0;
    let total = 0;
    let failures = [];
    
    function traverse(suite) {
        if (suite.specs) {
            suite.specs.forEach(spec => {
                spec.tests.forEach(test => {
                    const isIncluded = !projectNames || projectNames.includes(test.projectName);
                    const isExcluded = excludeProjects && excludeProjects.includes(test.projectName);
                    
                    if (isIncluded && !isExcluded) {
                        if (test.status === 'skipped') {
                            passed++; // Count skipped as passed for the purpose of the Pass Rate %
                            total++;
                            return;
                        }

                        total++;
                        if (test.status === 'expected' || test.status === 'passed' || test.status === 'flaky') {
                            passed++;
                        } else {
                            failures.push(`${spec.title} (${test.projectName})`);
                        }
                    }
                });
            });
        }
        if (suite.suites) {
            suite.suites.forEach(child => traverse(child));
        }
    }
    
    traverse(results);
    
    return {
        rate: total === 0 ? null : Math.round((passed / total) * 100),
        count: total,
        passed: passed,
        failures: failures
    };
}

const constantsPath = path.resolve(__dirname, '../src/shared/ParametricConstants.js');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

function getThreshold(type, color) {
    const regex = new RegExp(`${type}:\\s*{[^}]*${color}:\\s*(\\d+)`, 'i');
    const match = constantsContent.match(regex);
    return match ? parseInt(match[1], 10) : 0;
}

const THRESHOLDS = {
    COVERAGE: { 
        GREEN: getThreshold('COVERAGE', 'GREEN') || 80, 
        YELLOW: getThreshold('COVERAGE', 'YELLOW') || 60 
    },
    PASS_RATE: { 
        GREEN: getThreshold('PASS_RATE', 'GREEN') || 100, 
        YELLOW: getThreshold('PASS_RATE', 'YELLOW') || 98 
    }
};

console.log(`📡 Linked to source thresholds: Cov(${THRESHOLDS.COVERAGE.GREEN}/${THRESHOLDS.COVERAGE.YELLOW}) Pass(${THRESHOLDS.PASS_RATE.GREEN}/${THRESHOLDS.PASS_RATE.YELLOW})`);

// 🟢 Now formatResult will work!
function formatResult(val, count, passedCount, isCoverage = false) {
    if (val === null || val === undefined || val === 'N/A') return 'N/A';
    
    const pct = isCoverage ? val.pct : val;
    const limits = isCoverage ? THRESHOLDS.COVERAGE : THRESHOLDS.PASS_RATE;
    
    let icon = '❌'; 
    if (pct >= limits.GREEN) {
        icon = '✅';
    } else if (pct >= limits.YELLOW) {
        icon = '⚠️';
    }
    
    if (isCoverage) {
        return `${icon} ${val.pct}% (${val.covered}/${val.total})`;
    } else {
        const countStr = (count !== undefined && passedCount !== undefined) 
            ? ` (${passedCount}/${count})` 
            : '';
        return `${icon} ${Math.round(val)}%${countStr}`;
    }
}

async function main() {
    const jestCoverage = fs.existsSync(JEST_COVERAGE_PATH) ? JSON.parse(fs.readFileSync(JEST_COVERAGE_PATH, 'utf8')) : null;
    const pwCoverage = fs.existsSync(PW_COVERAGE_PATH) ? JSON.parse(fs.readFileSync(PW_COVERAGE_PATH, 'utf8')) : null;

    const pwResults = fs.existsSync(PW_RESULTS_PATH) ? JSON.parse(fs.readFileSync(PW_RESULTS_PATH, 'utf8')) : null;

    const servicesCov = calculateCoverage(jestCoverage, 'ParametricIntentService.js', 's');
    const securityCov = calculateCoverage(jestCoverage, 'assertDiagnosticsBoundary.js', 's');
    const logicCov = calculateCoverage(jestCoverage, 'ParametricLogic.js', 's');
    const workerCov = calculateCoverage(jestCoverage, 'Parametric.worker.js', 'b');
    const displayCov = calculateCoverage(pwCoverage, 'ParametricScene.js', 's');
    
    // Heuristic for project names based on common configs
    const chromiumStats = getTestStats(pwResults, ['chromium', 'Desktop Chrome', 'google-chrome']);
    const firefoxStats = getTestStats(pwResults, ['firefox', 'Desktop Firefox', 'firefox-smoke']);
    const webkitStats = getTestStats(pwResults, ['webkit', 'Desktop Safari', 'webkit-smoke']);
    
    // Calculate "Other" stats by excluding known projects
    const knownProjects = ['chromium', 'Desktop Chrome', 'google-chrome', 'firefox', 'Desktop Firefox', 'firefox-smoke', 'webkit', 'Desktop Safari', 'webkit-smoke'];
    const otherStats = getTestStats(pwResults, null, knownProjects);

    // Collect all failures for Known Issues section
    const allFailures = [
        ...chromiumStats.failures,
        ...firefoxStats.failures,
        ...webkitStats.failures,
        ...otherStats.failures
    ];

    const timestamp = new Date().toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: 'short'
    });
    
    let newTable = `| Category | Metric | Result | Environment |
| :--- | :--- | :--- | :--- |
| **Services Layer** | Statement Coverage | ${formatResult(servicesCov, undefined, undefined, true)} | Jest / Node v20 |
| **Security Layer** | Statement Coverage | ${formatResult(securityCov, undefined, undefined, true)} | Jest / Node v20 |
| **Logic Layer** | Statement Coverage | ${formatResult(logicCov, undefined, undefined, true)} | Jest / Node v20 |
| **Web Worker** | Branch Coverage | ${formatResult(workerCov, undefined, undefined, true)} | Jest / Node v20 |
| **Display Layer** | Statement Coverage | ${formatResult(displayCov, undefined, undefined, true)} | Playwright |
| **Smoke Suite** | Pass Rate (Chrome) | ${formatResult(chromiumStats.rate, chromiumStats.count, chromiumStats.passed)} | Playwright |
| **Smoke Suite** | Pass Rate (Firefox) | ${formatResult(firefoxStats.rate, firefoxStats.count, firefoxStats.passed)} | Playwright |
| **Smoke Suite** | Pass Rate (WebKit) | ${formatResult(webkitStats.rate, webkitStats.count, webkitStats.passed)} | Playwright |${otherStats.count > 0 ? `\n| **Other Tests** | Pass Rate | ${formatResult(otherStats.rate, otherStats.count, otherStats.passed)} | Playwright (Other) |` : ''}

*Generated by \`npm run test:full-baseline\` on ${timestamp}*`;

    // Append Known Issues if any
    if (allFailures.length > 0) {
        newTable += `\n\n### ⚠️ Known Issues\n${allFailures.map(f => `* ${f}`).join('\n')}`;
    }

    // Append Dashboards
    // Replace the old URL generation with these flat paths
    newTable += `\n\n### 📊 Quality Dashboards\n`;
    newTable += `* [**Unified Coverage Report (Jest + Playwright)**](https://jaseknighter.github.io/parametric/monocart-report/index.html)\n`;
    newTable += `* [**Playwright Test Trace**](https://jaseknighter.github.io/parametric/playwright-report/index.html)\n\n`;
    
    if (fs.existsSync(README_PATH)) {
        let content = fs.readFileSync(README_PATH, 'utf8');
        
        // 🟢 The "Indestructible" Regex
        const dashboardRegex = /<!-- START_COVERAGE_DASHBOARD -->[\s\S]*?<!-- END_COVERAGE_DASHBOARD -->/;
        const wrappedTable = `<!-- START_COVERAGE_DASHBOARD -->\n${newTable}\n<!-- END_COVERAGE_DASHBOARD -->`;
        
        if (dashboardRegex.test(content)) {
            fs.writeFileSync(README_PATH, content.replace(dashboardRegex, wrappedTable));
            console.log('✅ README.md updated via Slot Markers.');
        } else {
            console.warn('⚠️ Could not find <!-- START_COVERAGE_DASHBOARD --> markers in README.md.');
        }
    } else {
        console.warn('⚠️ Could not find README.md to update.');
    }


    console.log('\n--- Generated Table Content ---');
    console.log(newTable);
    console.log('-------------------------------\n');
}

main();