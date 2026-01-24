const fs = require('fs');
const path = require('path');

const coverageDir = path.resolve(__dirname, '../monocart-report/coverage');

if (!fs.existsSync(coverageDir)) {
    console.error(`❌ Coverage directory not found at: ${coverageDir}`);
    process.exit(1);
}

const shards = fs.readdirSync(coverageDir).filter(f => f.endsWith('.json') && !f.includes('summary') && !f.includes('index'));

console.log(`🔍 AUDITING ${shards.length} SHARDS...`);

shards.forEach(shard => {
  const content = JSON.parse(fs.readFileSync(path.join(coverageDir, shard), 'utf8'));
  const files = Object.keys(content);
  
  let totalHits = 0;
  files.forEach(f => {
    if (content[f] && content[f].s) {
        totalHits += Object.values(content[f].s).reduce((a, b) => a + b, 0);
    }
  });

  console.log(`   📄 Shard: ${shard}`);
  console.log(`      - Files included: ${files.length}`);
  console.log(`      - Total statement hits: ${totalHits}`);
  
  if (totalHits === 0) {
    console.error(`      ❌ CRITICAL: Shard is hollow! Instrumentation exists but no code was executed.`);
  } else {
    console.log(`      ✅ Valid data detected.`);
  }
});