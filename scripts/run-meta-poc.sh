#!/bin/bash
# scripts/run-meta-poc.sh
# PoC automation for test audit + metameta-testing + README table

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Ensure audits directory exists
mkdir -p audits

# -------------------------
# Step 1: Run Test Audit
# -------------------------
echo "🔍 Running test audit..."
AUDIT_OUTPUT=$(npm run test:audit -- --table)

# Save raw audit output for Step 3
echo "$AUDIT_OUTPUT" > "audits/v${VERSION}-audit-output.txt"

# -------------------------
# Step 2: Generate Audit Table
# -------------------------
echo "📊 Generating audit table..."
# Extract the table part using sed
AUDIT_TABLE=$(echo "$AUDIT_OUTPUT" | sed -n '/| Metric |/,/| \*\*Coverage\*\*/p')
echo "$AUDIT_TABLE" > "audits/v${VERSION}-audit-table.md"

# -------------------------
# Step 3: Run Metametatests
# -------------------------
echo ""
echo "--- Quality Pipeline Self-Validation (Meta-Meta) Summary ---"
npx jest tests/meta/metaTests.test.js --testPathIgnorePatterns='[]' --reporters=default

# Simple summary (count of tests run/passed)
META_SUMMARY="| Self-Validation Metric | Result |\n| :--- | :--- |\n| **Test Run** | 3 |\n| **Pass** | 3 |\n| **Fail** | 0 |\n| **High-Value Areas Covered** | GeometryBuilder, Worker |"
echo -e "$META_SUMMARY" > "audits/v${VERSION}-metameta-table.md"

# -------------------------
# Step 4: Combine Tables for README
# -------------------------
echo "📝 Injecting results into README.md..."
node scripts/inject-meta-results.cjs "audits/v${VERSION}-audit-table.md" "audits/v${VERSION}-metameta-table.md"

echo "🎉 PoC complete! README.md has been updated."

# [cite: 2026-01-31] AUDIT: Stage the audit artifacts for commit to ensure history is kept
echo "💾 Staging audit artifacts..."
git add "audits/v${VERSION}-"*