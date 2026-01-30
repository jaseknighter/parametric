/**
 * @fileoverview sync-readme.js
 * AUTOMATION: Updates README.md with the latest GUIDANCE_REGISTRY data.
 * [cite: 2026-01-27]
 */

import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGuidanceRegistry } from '../src/shared/GUIDANCE_REGISTRY/loadGuidanceRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT_DIR, 'README.md');

const START_MARKER = '<!-- START_UI_REFERENCE -->';
const END_MARKER = '<!-- END_UI_REFERENCE -->';

const GUIDANCE_REGISTRY = loadGuidanceRegistry();

function generateTable() {
  let output = "";

  // 1. HUD Section (Above Table)
  const hud = GUIDANCE_REGISTRY.HUD_TITLE;
  if (hud) {
    output += `\n### ${hud.title}\n\n`;
    output += `> **${hud.intent}**\n\n`;
    output += `${hud.proseBehavior || hud.tableBehavior}\n\n`;
    output += `### Math Reference\n\n`;
    output += `The following math functions and constants are supported in the Formula Editor:\n\n`;
    output += `\`sin\`, \`cos\`, \`tan\`, \`atan2\`, \`abs\`, \`sqrt\`, \`pow\`, \`exp\`, \`log\`, \`min\`, \`max\`, \`sign\`, \`floor\`, \`ceil\`, \`round\`, \`PI\` (or \`π\`), \`E\`.\n\n`;
    output += `---\n\n`;
  }

  output += `!Interface Reference\n\n`;

  // 2. Interface Reference Table
  output += `### Interface Reference\n\n`;
  output += `| Interface Element | What does it do? | How does it work? |\n`;
  output += `| :--- | :--- | :--- |\n`;

  Object.entries(GUIDANCE_REGISTRY).forEach(([key, entry]) => {
    if (entry.docScope === 'table') {
      // [cite: 2026-01-27] FIX: Use dedicated mathExpression field, fallback to tableBehavior. No regex.
      const rawContent = entry.math ? entry.mathExpression : entry.tableBehavior;
      const howItWorks = rawContent ? rawContent.replace(/\|/g, '\\|') : '';
      
      let title = `**${entry.title}**`;
      const colonIndex = entry.title.indexOf(':');
      if (colonIndex !== -1) {
        title = `**${entry.title.substring(0, colonIndex)}:**${entry.title.substring(colonIndex + 1)}`;
      }
      output += `| ${title} | ${entry.intent} | ${howItWorks} |\n`;
    }
  });

  return output + '\n';
}

function updateReadme() {
  try {
    let content = fs.readFileSync(README_PATH, 'utf-8');
    const table = generateTable();

    const regex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
    
    if (!regex.test(content)) {
      console.error('❌ Markers not found in README.md. Please add <!-- START_UI_REFERENCE --> and <!-- END_UI_REFERENCE -->.');
      process.exit(1);
    }

    const newContent = content.replace(regex, `${START_MARKER}${table}${END_MARKER}`);
    fs.writeFileSync(README_PATH, newContent, 'utf-8');
    console.log('✅ README.md updated with latest Guidance Registry.');
  } catch (err) {
    console.error('❌ Failed to update README:', err);
    process.exit(1);
  }
}

updateReadme();