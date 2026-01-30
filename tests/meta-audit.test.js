import analysis from '../scripts/analyze-tests.cjs';
const { runAudit, config } = analysis;

describe('Meta-Testing Audit Scanner', () => {
  // Temporarily override config to scan only the mock directory
  const originalIgnore = [...config.ignore];
  
  beforeAll(() => {
    // Allow scanning mock-meta for this test
    config.ignore = config.ignore.filter(i => i !== 'mock-meta');
  });

  afterAll(() => {
    config.ignore = originalIgnore;
  });

  test('[behavior] correctly categorizes tagged and untagged tests', () => {
    // Point the scanner at the mock directory
    const mockDir = 'tests/mock-meta';
    const stats = runAudit([mockDir]);

    // Based on tests/mock-meta/mock.test.js:
    // 1. [behavior]
    // 2. [policy]
    // 3. [failure-mode]
    // 4. untagged
    // 5. malformed (untagged)
    
    expect(stats.total).toBe(5);
    expect(stats.tagged).toBe(3);
    expect(stats.suspect).toBe(2);
    
    expect(stats.byTag['[behavior]']).toBe(1);
    expect(stats.byTag['[policy]']).toBe(1);
    expect(stats.byTag['[failure-mode]']).toBe(1);
  });
});