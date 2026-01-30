import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function summarizeShards(shardDir) {
  const isVerbose = process.argv.includes('--details');
  
  if (!fs.existsSync(shardDir)) {
    console.log(`[Shard Summary] Directory not found: ${shardDir}`);
    return;
  }

  const files = fs.readdirSync(shardDir).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('[Shard Summary] No JSON shards found.');
    return;
  }

  let totalFiles = 0;
  let totalStatements = 0;
  let totalBranches = 0;

  if (isVerbose) {
    console.log('--------------------------------------------');
  }

  for (const file of files) {
    const filePath = path.join(shardDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      const fileCount = Object.keys(data).length;
      totalFiles += fileCount;

      let stmtCount = 0;
      let branchCount = 0;
      
      Object.values(data).forEach(fileCov => {
          if (fileCov.s) stmtCount += Object.keys(fileCov.s).length;
          if (fileCov.b) branchCount += Object.keys(fileCov.b).length;
      });
      
      totalStatements += stmtCount;
      totalBranches += branchCount;

      if (isVerbose) {
        const samplePath = Object.keys(data)[0] || 'N/A';
        console.log(`📄 Shard: ${file} | files=${fileCount} | statements=${stmtCount} | branches=${branchCount}`);
        console.log(`   🔎 Sample Path: ${samplePath}`);
      }
    } catch (e) {
      console.error(`⚠️ Failed to parse shard ${file}: ${e.message}`);
    }
  }

  console.log('--------------------------------------------');
  console.log(`✅ Total shards: ${files.length}`);
  console.log(`📁 Total files (sum): ${totalFiles}`);
  console.log(`📊 Total statements: ${totalStatements}`);
  console.log('--------------------------------------------');
  
  if (!isVerbose) {
    console.log('To list shard details, run: npm run coverage:shards');
  }
}

// Allow standalone execution via node
if (process.argv[1] === __filename) {
  const shardDir = path.resolve(__dirname, '../raw-shards');
  summarizeShards(shardDir);
}