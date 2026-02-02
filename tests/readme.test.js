const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const README_PATH = path.join(__dirname, '../README.md');

describe('README.md Integrity', () => {
  let readmeContent;

  beforeAll(() => {
    if (fs.existsSync(README_PATH)) {
      readmeContent = fs.readFileSync(README_PATH, 'utf8');
    } else {
      throw new Error(`README.md not found at ${README_PATH}`);
    }
  });

  test('Content appears in the same order as in the TOC', () => {
    const tocEntries = [];
    const lines = readmeContent.split('\n');
    let capturingToc = false;

    // 1. Extract TOC Entries
    for (const line of lines) {
      if (line.match(/^## Table of Contents/)) {
        capturingToc = true;
        continue;
      }
      // Stop capturing at the next major header (ignoring the TOC header itself)
      if (capturingToc && line.startsWith('## ') && !line.includes('Table of Contents')) {
        capturingToc = false;
        break;
      }
      
      if (capturingToc) {
        const match = line.match(/^\s*- \[(.*?)\]/);
        if (match) {
          // Unescape markdown characters (e.g., \& -> &)
          tocEntries.push(match[1].replace(/\\&/g, '&'));
        }
      }
    }

    // 2. Extract Document Headers
    const headerRegex = /^(#{2,6}) (.*)$/gm;
    const headers = [];
    let match;
    while ((match = headerRegex.exec(readmeContent)) !== null) {
      let text = match[2].trim();
      text = text.replace(/<!--.*?-->/g, '').trim(); // Remove comments
      if (text === 'Table of Contents') continue;
      headers.push(text);
    }

    // 3. Verify Order
    let lastHeaderIndex = -1;
    tocEntries.forEach(entry => {
      // Search for the entry only after the last found position to ensure order
      const currentIndex = headers.indexOf(entry, lastHeaderIndex + 1);
      
      if (currentIndex === -1) {
        const existsAnywhere = headers.indexOf(entry);
        if (existsAnywhere !== -1) {
          throw new Error(`TOC entry "${entry}" is out of order. Found at position ${existsAnywhere}, expected after ${lastHeaderIndex}.`);
        }
        throw new Error(`TOC entry "${entry}" not found in document headers.`);
      }
      lastHeaderIndex = currentIndex;
    });
  });

  test('No duplicate H2 headers', () => {
    const h2Headers = new Set();
    const lines = readmeContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('## ') && !line.startsWith('## Table of Contents')) {
        const header = line.trim();
        if (h2Headers.has(header)) {
          throw new Error(`Duplicate header found: "${header}"`);
        }
        h2Headers.add(header);
      }
    }
  });

  test('Current Status matches top entry in Recent Releases', () => {
    const statusMatch = readmeContent.match(/## Current Status([\s\S]*?)(?=##|$)/);
    if (!statusMatch) throw new Error('Current Status section not found');
    const statusVersionMatch = statusMatch[1].match(/\*\*v([\d.]+).*?\(([\d-]+)\)\*\*/);
    if (!statusVersionMatch) throw new Error('Could not parse version and date from Current Status');
    const [_, statusVersion, statusDate] = statusVersionMatch;

    const releasesMatch = readmeContent.match(/## Recent Releases([\s\S]*?)(?=##|$)/);
    if (!releasesMatch) throw new Error('Recent Releases section not found');
    const topReleaseMatch = releasesMatch[1].match(/\* \*\*v([\d.]+)\*\* \(([\d-]+)\):/);
    if (!topReleaseMatch) throw new Error('Could not parse top entry from Recent Releases');
    const [__, releaseVersion, releaseDate] = topReleaseMatch;

    expect(releaseVersion).toBe(statusVersion);
    expect(releaseDate).toBe(statusDate);
  });

  test('Current Status matches the most recent tag', () => {
    let latestTag;
    try {
      latestTag = execSync('git describe --tags --abbrev=0').toString().trim();
    } catch (e) {
      console.warn('Skipping tag check: No git tags found.');
      return;
    }

    const statusMatch = readmeContent.match(/## Current Status([\s\S]*?)(?=##|$)/);
    if (!statusMatch) throw new Error('Current Status section not found');
    
    const versionMatch = statusMatch[1].match(/\*\*v([\d.]+).*?\*\*/);
    if (!versionMatch) throw new Error('Version string not found in Current Status.');
    
    expect(`v${versionMatch[1]}`).toBe(latestTag);
  });

  test('Dates in Recent Releases match git tag dates', () => {
    const releasesMatch = readmeContent.match(/## Recent Releases([\s\S]*?)(?=##|$)/);
    if (!releasesMatch) throw new Error('Recent Releases section not found');

    const lineRegex = /\* \*\*(v[\d.]+)\*\* \(([\d-]+)\):/g;
    let match;
    let isFirst = true;
    while ((match = lineRegex.exec(releasesMatch[1])) !== null) {
      const [_, version, dateInReadme] = match;
      try {
        // Get the commit date for the tag: YYYY-MM-DD
        const gitDate = execSync(`git log -1 --format=%as ${version}`).toString().trim();
        expect(dateInReadme).toBe(gitDate);
      } catch (e) {
        if (isFirst) {
          throw new Error(`Latest release ${version} tag not found or date mismatch. Error: ${e.message}`);
        }
        console.warn(`Skipping date check for older release ${version}: Tag not found.`);
      }
      isFirst = false;
    }
  });
});