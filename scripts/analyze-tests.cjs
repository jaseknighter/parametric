const fs = require('fs');
const path = require('path');

const TAGS = ['[behavior]', '[policy]', '[failure-mode]'];
const SUSPECT_TAG = '[suspect]';

const SEMANTIC_RULES = {
  behavior: ['fireEvent', 'userEvent', 'click', 'fill', 'press', 'page.', 'postMessage', 'onMessage', 'result'],
  policy: ['toThrow', 'ReadOnly', 'frozen', 'Boundary', 'expect.extend', 'sanitize', 'validate', 'defaults'],
  'failure-mode': ['error', 'NaN', 'terminate', 'Infinity', 'invalid', 'spyOn']
};

const config = {
  testDirs: ['src', 'tests'],
  extensions: ['.test.js', '.spec.js'],
  // Ignore mock-meta by default so it doesn't pollute the real audit
  ignore: ['node_modules', 'dist', 'build', 'coverage', 'mock-meta']
};

let stats = {
  total: 0,
  tagged: 0,
  suspect: 0,
  byTag: {},
  suspectList: [],
  allTests: [],
  intentMismatches: 0,
  weakAssertions: 0,
  dynamic: 0,
  grading: {
    behavior: { strong: 0, weak: 0, mismatched: 0 },
    policy: { strong: 0, weak: 0, mismatched: 0 },
    'failure-mode': { strong: 0, weak: 0, mismatched: 0 }
  }
};

function resetStats() {
  stats.total = 0;
  stats.tagged = 0;
  stats.suspect = 0;
  stats.byTag = {};
  stats.suspectList = [];
  stats.allTests = [];
  stats.intentMismatches = 0;
  stats.weakAssertions = 0;
  stats.dynamic = 0;
  stats.grading = {
    behavior: { strong: 0, weak: 0, mismatched: 0 },
    policy: { strong: 0, weak: 0, mismatched: 0 },
    'failure-mode': { strong: 0, weak: 0, mismatched: 0 }
  };
  TAGS.forEach(t => stats.byTag[t] = 0);
}

function analyzeSemanticIntegrity(testName, testBody) {
  const tagMatch = testName.match(/\[(behavior|policy|failure-mode)\]/i);
  if (!tagMatch) return { status: 'suspect', reason: 'untagged' };

  const tag = tagMatch[1].toLowerCase();
  // [cite: 2026-01-29] HEURISTIC: Check if body contains markers relevant to the tag
  const hasMarkers = SEMANTIC_RULES[tag].some(m => testBody.includes(m));
  
  if (!hasMarkers) return { status: 'suspect', reason: 'mismatched-intent', grade: 'mismatched', tag };
  
  // [cite: 2026-01-29] HEURISTIC: Check for Strong Assertions
  // Weak markers: toBeDefined, toBeTruthy, toBeFalsy, not.toBeNull
  const weakAssertions = ['toBeDefined', 'toBeTruthy', 'toBeFalsy', 'not.toBeNull'];
  // Find all .toSomething(
  const assertions = (testBody.match(/\.to[a-zA-Z0-9_]+\(/g) || []).map(a => a.slice(1, -1));
  
  const hasStrong = assertions.some(a => !weakAssertions.includes(a));
  
  if (testBody.includes('expect(') && !hasStrong && assertions.length > 0) {
      return { status: 'suspect', reason: 'weak-assertion', grade: 'weak', tag };
  }
    
  return { status: 'valid', grade: 'strong', tag };
}

resetStats();

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Regex to capture test descriptions. Matches test('desc', ...) or it("desc", ...)
    // Handling single quotes, double quotes, and backticks.
    const regex = /(?:test|it)(?:\.(?:only|skip))?\s*\(\s*(['"`])(.*?)\1/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      const description = match[2];
      stats.total++;

      // [cite: 2026-01-29] METRIC: Detect parameterized tests (loops/templates)
      if (description.includes('${')) {
          stats.dynamic++;
      }

      const matchEnd = match.index + match[0].length;

      // [cite: 2026-01-29] PARSER: Extract test body for semantic analysis
      // Find first { after matchEnd, then balance braces
      let bodyStartIndex = content.indexOf('{', matchEnd);
      let testBody = "";
      if (bodyStartIndex !== -1) {
          let braceCount = 1;
          let i = bodyStartIndex + 1;
          while (i < content.length && braceCount > 0) {
              if (content[i] === '{') braceCount++;
              else if (content[i] === '}') braceCount--;
              i++;
          }
          testBody = content.substring(bodyStartIndex, i);
      }
      
      const analysis = analyzeSemanticIntegrity(description, testBody);
      const foundTag = analysis.tag ? `[${analysis.tag}]` : null;
      
      stats.allTests.push({
        path: filePath,
        name: description,
        tags: foundTag ? [foundTag] : [],
        status: analysis.status,
        reason: analysis.reason,
        grade: analysis.grade
      });
      
      if (analysis.tag && stats.grading[analysis.tag]) {
          stats.grading[analysis.tag][analysis.grade]++;
      }

      if (analysis.status === 'valid' && foundTag) {
        stats.tagged++;
        stats.byTag[foundTag]++;
      } else {
        if (analysis.reason === 'mismatched-intent') stats.intentMismatches++;
        if (analysis.reason === 'weak-assertion') stats.weakAssertions++;
        
        stats.suspect++;
        stats.suspectList.push({ file: filePath, name: description, reason: analysis.reason });
      }
    }
  } catch (err) {
    console.error(`[ERROR] Failed to scan ${filePath}:`, err.message);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (config.ignore.some(ignored => fullPath.includes(ignored))) continue;

    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (config.extensions.some(ext => file.endsWith(ext))) {
      scanFile(fullPath);
    }
  }
}

function getCoveragePct() {
  // Try standard Istanbul summary locations
  const paths = [
    'coverage/coverage-summary.json',
    'monocart-report/coverage/coverage-summary.json'
  ];
  
  for (const p of paths) {
    const fullPath = path.resolve(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        return summary.total?.statements?.pct + '%' || 'N/A';
      } catch (e) {
        // ignore malformed coverage
      }
    }
  }
  return 'N/A';
}

function runAudit(dirs) {
  resetStats();
  const targetDirs = dirs || config.testDirs;
  console.log(`Scanning directories: ${targetDirs.join(', ')}`);
  
  targetDirs.forEach(dir => {
    const fullPath = path.resolve(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      walkDir(fullPath);
    } else {
        console.warn(`[WARN] Directory not found: ${fullPath}`);
    }
  });
  return stats;
}

if (require.main === module) {
  console.log('Starting Test Audit...');
  console.log('\n--- Active Heuristics ---');
  Object.entries(SEMANTIC_RULES).forEach(([tag, markers]) => {
      console.log(`  [${tag}] requires markers: ${markers.join(', ')}`);
  });
  console.log('  [Intent Visibility Gap] if only weak assertions found (toBeDefined, toBeTruthy, etc.)');

  const results = runAudit();
  const coverage = getCoveragePct();
  
  console.log('\n--- Audit Summary ---');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Tagged:      ${results.tagged}`);
  if (results.dynamic > 0) {
    console.log(`Dynamic:     ${results.dynamic} (Templates generating multiple runtime tests)`);
  }
  console.log(`Intent Visibility Gaps: ${results.suspect}`);
  const untagged = results.suspect - results.intentMismatches - results.weakAssertions;
  console.log(`  ├── Unclassified:       ${untagged}`);
  console.log(`  ├── Intent Mismatches:  ${results.intentMismatches}`);
  console.log(`  └── Weak Assertions:    ${results.weakAssertions}`);
  console.log(`Coverage:    ${coverage}`);
  console.log('\n--- By Tag ---');
  Object.entries(results.byTag).forEach(([tag, count]) => {
    console.log(`${tag.padEnd(15)}: ${count}`);
  });
  
  console.log('\n--- Meta Testing Assessment ---');
  let totalTaggedCount = 0;
  let totalStrong = 0;
  Object.values(results.grading).forEach(g => {
      totalTaggedCount += g.strong + g.weak + g.mismatched;
      totalStrong += g.strong;
  });
  
  const alignmentPct = totalTaggedCount > 0 ? Math.round((totalStrong / totalTaggedCount) * 100) : 0;
  const healthIcon = alignmentPct > 80 ? '🟢' : (alignmentPct > 50 ? '🟡' : '🔴');
  console.log(`Intent Signal Coverage: ${healthIcon} ${alignmentPct > 80 ? 'GREEN' : (alignmentPct > 50 ? 'YELLOW' : 'RED')} (${alignmentPct}% of tagged tests meet declared intent)`);
  
  console.log('\nValues represent the number of tests per grade:');
  Object.entries(results.grading).forEach(([tag, grades]) => {
      console.log(`[${tag}]`.padEnd(15) + `: 🟢 ${grades.strong}  | 🟡 ${grades.weak}  | 🔴 ${grades.mismatched}`);
  });

  console.log('\nCriteria:');
  console.log('🟢 Strong: Tag + Marker + Strong Assertion');
  console.log('🟡 Weak:   Tag + Marker + Existence-only Assertion');
  console.log('🔴 Miss:   Tag exists but implementation doesn\'t match intent');
  
  const iconMap = { strong: '🟢', weak: '🟡', mismatched: '🔴' };
  
  if (process.argv.includes('--list-tagged')) {
    console.log('\n--- Tagged Test Details ---');
    results.allTests.filter(t => t.tags.length > 0).forEach(t => {
      const icon = iconMap[t.grade] || '❓';
      console.log(`${icon} ${path.basename(t.path)}: "${t.name}"`);
    });
  } else {
    console.log('\n--- Tagged Test Summary ---');
    const taggedFiles = {};
    results.allTests.filter(t => t.tags.length > 0).forEach(t => {
      const fileName = path.basename(t.path);
      if (!taggedFiles[fileName]) taggedFiles[fileName] = { total: 0, strong: 0, weak: 0, mismatched: 0 };
      taggedFiles[fileName].total++;
      if (t.grade === 'strong') taggedFiles[fileName].strong++;
      else if (t.grade === 'weak') taggedFiles[fileName].weak++;
      else if (t.grade === 'mismatched') taggedFiles[fileName].mismatched++;
    });

    console.log('| File                                     | Total | 🟢 Strong | 🟡 Weak | 🔴 Miss |');
    console.log('| :--------------------------------------- | :---: | :-------: | :-----: | :-----: |');

    Object.entries(taggedFiles).forEach(([file, stats]) => {
      const fName = file.length > 40 ? file.substring(0, 37) + '...' : file;
      console.log(`| ${fName.padEnd(40)} | ${String(stats.total).padStart(5)} | ${String(stats.strong).padStart(9)} | ${String(stats.weak).padStart(7)} | ${String(stats.mismatched).padStart(7)} |`);
    });
    console.log('\nTo list detailed tagged test results, run: npm run test:audit -- --list-tagged');
  }

  if (process.argv.includes('--list-suspects')) {
    if (results.suspectList.length > 0) {
      console.log('\n--- Suspect Tests ---');
      results.suspectList.forEach(item => {
        console.log(`[SUSPECT] (${item.reason}) ${path.basename(item.file)}: "${item.name}"`);
      });
    } else {
      console.log('\nNo suspect tests found.');
    }
  }

  // Markdown Table Output for README/CI
  if (process.argv.includes('--table')) {
    console.log('\n--- Markdown Table ---');
    console.log('| Metric | Result |');
    console.log('| :--- | :--- |');
    console.log(`| **Total Tests (Static)** | ${results.total} ${results.dynamic > 0 ? `(+${results.dynamic} Dynamic Templates)` : ''} |`);
    console.log(`| **Tagged** | ${results.tagged} |`);
    console.log(`| **Intent Alignment** | ${results.intentMismatches > 0 ? '🚨' : '✅'} ${results.intentMismatches} Mismatches |`);
    console.log(`| **Strong Assertion Ratio** | ${results.weakAssertions > 0 ? '⚠️' : '✅'} ${results.weakAssertions} Weak |`);
    console.log(`| **Intent Visibility Gaps** | ${results.suspect} <br> *(tests not yet semantically classified)* |`);
    console.log(`| **Coverage** | ${coverage} |`);
  }

  console.log('\n--- Command Summary ---');
  const commands = [
    { task: 'View Unified Report', cmd: 'npx monocart show-report monocart-report/index.html' },
    { task: 'View Playwright Report', cmd: 'npx playwright show-report' },
    { task: 'View Coverage Shards', cmd: 'npm run coverage:shards' },
    { task: 'List Suspect Tests', cmd: 'npm run test:audit -- --list-suspects' },
    { task: 'List Tagged Details', cmd: 'npm run test:audit -- --list-tagged' },
  ];

  commands.forEach(({ task, cmd }) => {
    console.log(`${task.padEnd(25)} : ${cmd}`);
  });

  if (results.suspect > 0 && process.argv.includes('--strict')) {
    console.error('\n[FAILURE] Suspect tests detected (Strict Mode).');
    process.exit(1);
  } else if (results.suspect > 0) {
    if (!process.argv.includes('--table')) {
      console.warn('\n[INFO] Intent visibility gaps detected. Run with --strict to enforce tagging.');
    }
  } else {
    console.log('\n[SUCCESS] All tests tagged.');
  }
}

module.exports = { runAudit, config, getCoveragePct };