import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loadGuidanceRegistry } from '../src/shared/GUIDANCE_REGISTRY/loadGuidanceRegistry.js';

/**
 * @fileoverview readme-sync.spec.js
 * VERIFICATION: Ensures README.md is synchronized with GUIDANCE_REGISTRY.
 * NOTE: This is a Node-only contract test; no browser involved.
 * [cite: 2026-01-27] Phase 1: Shared Content Contract
 */

// [cite: 2026-01-30] FIX: Normalize markdown formatting for semantic comparison
function normalizeTitle(str) {
  return str
    .replace(/\*\*/g, '')   // remove bold markers
    .replace(/\s+/g, ' ')   // normalize whitespace
    .trim();
}

test.describe('Documentation Synchronization', () => {
  const readmePath = path.join(process.cwd(), 'README.md');
  let readmeContent;
  const GUIDANCE_REGISTRY = loadGuidanceRegistry();

  test.beforeAll(() => {
    readmeContent = fs.readFileSync(readmePath, 'utf-8');
  });

  test('Structural Integrity: Registry entries have valid docScope classification', () => {
    const validScopes = ['ui', 'table', 'prose', 'hidden'];
    
    Object.entries(GUIDANCE_REGISTRY).forEach(([key, entry]) => {
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('intent');
      expect(entry).toHaveProperty('link');
      
      // [cite: 2026-01-27] GUARD: Ensure docScope is defined and valid
      expect(entry.docScope).toBeDefined();
      expect(validScopes).toContain(entry.docScope);
      
      if (entry.math) {
        expect(entry.mathExpression).toBeDefined();
        // Logic Guard: If it has math:true, it MUST be in the table
        expect(entry.docScope).toBe('table');
      }
    });
  });

  test('Recursion Guard: Registry behavior strings do not contain document-level markers', () => {
    const forbiddenFragments = [
      /^#\s/m,                     // Markdown headers
      /^!\[.*\]\(/m,               // Markdown images
      '<!-- START_',
      '<!-- END_',
      'Table of Contents',
      'Parametric 3D Engine'
    ];

    Object.entries(GUIDANCE_REGISTRY).forEach(([key, entry]) => {
      if (!entry.tableBehavior) return;

      forbiddenFragments.forEach(fragment => {
        expect(entry.tableBehavior).not.toMatch(fragment);
      });
    });
  });

  test('Recursion Guard: No README markers appear in generated UI reference', () => {
    // This test is implicitly covered by the "Zero-Drift" tests below which check content,
    // but explicit negative assertions against markers are good.
    const tableRows = readmeContent.split('\n').filter(line => line.trim().startsWith('| **'));
    tableRows.forEach(row => {
      expect(row).not.toContain('<!-- START_UI_REFERENCE -->');
      expect(row).not.toContain('Parametric 3D Engine');
    });
  });

  test('Table Cell Size Guard: Table-bound registry entries are short-form', () => {
    Object.entries(GUIDANCE_REGISTRY).forEach(([key, entry]) => {
      if (entry.docScope === 'table') {
        expect(entry.intent.length).toBeLessThan(200);
        if (entry.tableBehavior) {
          expect(entry.tableBehavior.length).toBeLessThan(300);
        }
      }
    });
  });

  test('README Smoke Test: Has exactly one UI Reference injection block', () => {
    expect(readmeContent.match(/<!-- START_UI_REFERENCE -->/g)?.length).toBe(1);
    expect(readmeContent.match(/<!-- END_UI_REFERENCE -->/g)?.length).toBe(1);
  });

  test('README contains Interface Reference section', () => {
    expect(readmeContent).toContain('## Interface Reference');
    expect(readmeContent).toContain('| Interface Element | What does it do? | How does it work? |');
  });

  test('Zero-Drift: README includes all documented registry entries', () => {
    const documentedEntries = Object.entries(GUIDANCE_REGISTRY)
      .filter(([key, e]) => e.docScope === 'table')
      .map(([_, e]) => e);
    
    documentedEntries.forEach(entry => {
      expect(normalizeTitle(readmeContent)).toContain(normalizeTitle(entry.title));
    });
  });

  test('Zero-Drift: README contains no undocumented rows', () => {
    const documentedEntries = Object.entries(GUIDANCE_REGISTRY)
      .filter(([key, e]) => e.docScope === 'table')
      .map(([_, e]) => e);
    
    // [cite: 2026-01-27] FIX: Scope parsing to the Math Reference section only
    const mathSection = readmeContent.split('## Interface Reference')[1] || '';
    
    const tableRows = mathSection.split('\n')
      .filter(line => line.trim().startsWith('| **') && !line.includes('Section'));

    tableRows.forEach(row => {
      const matches = documentedEntries.some(entry => normalizeTitle(row).includes(normalizeTitle(entry.title)));
      expect(matches, `Found undocumented row in README: ${row}`).toBe(true);
    });
  });
});