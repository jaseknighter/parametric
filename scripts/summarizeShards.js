import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function ts() { return new Date().toISOString(); }

export async function summarizeShards(coverageDir) {
  if (!existsSync(coverageDir)) {
    console.error(`❌ Coverage directory does not exist: ${coverageDir}`);
    return;
  }

  // 🟢 ASYNC: Read directory
  const files = await fs.readdir(coverageDir);
  const shardFiles = files.filter(f => 
    f.endsWith('.json') && !f.includes('summary') && !f.includes('index')
  );

  if (shardFiles.length === 0) {
    console.warn(`⚠️ No coverage shards found in: ${coverageDir}`);
    return;
  }

  console.log(`\n🕒 [${ts()}] 🧮 Playwright Coverage Shard Summary`);
  console.log('--------------------------------------------');

  let totalShards = 0, totalFiles = 0, totalStatements = 0, totalBranches = 0, emptyShards = 0;

  for (const shard of shardFiles) {
    // 🟢 ASYNC: Read file contents
    const rawData = await fs.readFile(path.join(coverageDir, shard), 'utf-8');
    const content = JSON.parse(rawData);
    const files = Object.keys(content);

    let shardStatements = 0, shardBranches = 0;

    files.forEach(f => {
      const sHits = content[f].s ? Object.values(content[f].s).reduce((a, b) => a + b, 0) : 0;
      const bHits = content[f].b ? Object.values(content[f].b).flat().reduce((a, b) => a + b, 0) : 0;
      shardStatements += sHits;
      shardBranches += bHits;
    });

    console.log(`📄 Shard: ${shard} | files=${files.length} | statements=${shardStatements} | branches=${shardBranches}`);
    
    if (files.length > 0) {
        console.log(`   🔎 Sample Path: ${files[0]}`);
    }

    if (shardStatements === 0 && shardBranches === 0) emptyShards++;

    totalShards++;
    totalFiles += files.length;
    totalStatements += shardStatements;
    totalBranches += shardBranches;
  }

  console.log('--------------------------------------------');
  console.log(`✅ Total shards: ${totalShards}`);
  console.log(`📁 Total files: ${totalFiles}`);
  console.log(`📊 Total hits: ${totalStatements}`);
  console.log('--------------------------------------------\n');
}