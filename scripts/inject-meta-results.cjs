const fs = require('fs');
const path = require('path');

const README_PATH = path.join(__dirname, '../README.md');
const START_MARKER = '<!-- START_META_REPORT -->';
const END_MARKER = '<!-- END_META_REPORT -->';

const [,, auditTablePath, metaTablePath] = process.argv;

try {
  if (!fs.existsSync(auditTablePath) || !fs.existsSync(metaTablePath)) {
    throw new Error('Input table files not found.');
  }

  const readme = fs.readFileSync(README_PATH, 'utf8');
  const auditTable = fs.readFileSync(auditTablePath, 'utf8');
  const metaTable = fs.readFileSync(metaTablePath, 'utf8');

  const newContent = `
### Meta-Testing Report (Experimental Quality Signals - POC)

> Meta-testing was introduced in v0.5.4 as a **diagnostic experiment**, not a gate.
> Results are informational and are not used to fail CI.

This project evaluates quality at three distinct levels:

*   **Level 1 — Tests**
    Do features behave correctly?
*   **Level 2 — Meta-Tests**
    Do tests express the *right intent* and assert meaningful behavior?
*   **Level 3 — Quality Pipeline Self-Validation** 
    Does the auditing system itself work and remain trustworthy?

Only Level 1 tests affect CI pass/fail. Levels 2 and 3 are observability layers.

#### How to read this report
Meta-testing does not measure whether tests pass. It measures whether tests clearly express their intent.

*   🟢 **Strong** — intent declared, behavior exercised, assertion meaningful
*   🟡 **Weak** — intent declared, but assertion only checks existence
*   🔴 **Mismatch** — intent tag present, but implementation doesn’t validate it

Untagged tests are not considered failures. They represent areas not yet evaluated by this experimental system.

*Last Audit: ${new Date().toISOString().split('T')[0]}*

${auditTable}

### Quality Pipeline Self-Validation
*These tests ensure that:*
*   The audit can detect tagged and untagged tests
*   Metrics are retrievable and stable
*   Changes to the audit logic cannot silently invalidate reports

These serve as self-validation for the quality pipeline.

${metaTable}

> **Note:** As these metrics were generated from a POC, metrics are for demonstration purposes only as part of the POC.`;

  const regex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
  const updatedReadme = readme.replace(regex, `${START_MARKER}${newContent}\n${END_MARKER}`);

  fs.writeFileSync(README_PATH, updatedReadme);
  console.log('✅ README.md updated successfully (Targeted Injection).');

} catch (err) {
  console.error('❌ Failed to update README:', err.message);
  process.exit(1);
}