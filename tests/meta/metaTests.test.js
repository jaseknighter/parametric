const { runAudit, getCoveragePct } = require('../../scripts/analyze-tests.cjs');

describe('Metametatesting', () => {
  let auditResults;

  beforeAll(() => {
    // Run audit on src and tests to populate stats
    auditResults = runAudit(['src', 'tests']).allTests;
  });

  test('Tagged tests should be correctly identified', () => {
    const tagged = auditResults.filter(t => t.tags && t.tags.length > 0);
    expect(tagged.length).toBeGreaterThan(0);
  });

  test('Suspect tests should exist and be categorized', () => {
    const suspect = auditResults.filter(t => t.status === 'suspect');
    expect(suspect.length).toBeGreaterThan(0);
    
    const mismatched = suspect.find(t => t.reason === 'mismatched-intent');
    expect(mismatched).toBeDefined();

    const weak = suspect.find(t => t.reason === 'weak-assertion');
    expect(weak).toBeDefined();
  });

  test('Coverage metric should be retrievable', () => {
    const coverage = getCoveragePct();
    expect(coverage).toBeDefined();
  });
});